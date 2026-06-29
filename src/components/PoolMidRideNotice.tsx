import { useEffect, useState, useCallback } from 'react';
import { Users, MapPin, Loader2, Check, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { haversineMeters } from '@/hooks/useNearestDeck';

interface Props {
  pilotProfileId: string | undefined;
  pilotUserId: string | undefined;
  pilotName: string;
  pilotPhone: string;
  availableSeats: number;
  pilotLat: number | null;
  pilotLng: number | null;
  onAccepted?: () => void;
}

interface PendingRide {
  id: string;
  passenger_name: string | null;
  passenger_count: number;
  origin_name: string | null;
  origin_lat: number | null;
  origin_lng: number | null;
  destination_name: string | null;
  price: number;
  created_at: string;
}

const MAX_DISTANCE_M = 3_000;

const fmtDistance = (m: number): string => {
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(1)} km`;
};

const PoolMidRideNotice = ({ pilotProfileId, pilotUserId, pilotName, pilotPhone, availableSeats, pilotLat, pilotLng, onAccepted }: Props) => {
  const [pending, setPending] = useState<PendingRide | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [accepting, setAccepting] = useState(false);

  const fetchNearbyPending = useCallback(async () => {
    if (!pilotProfileId || availableSeats <= 0) {
      setPending(null);
      return;
    }
    const cutoff = new Date(Date.now() - 10 * 60_000).toISOString();
    const { data } = await supabase
      .from('rides')
      .select('id, passenger_name, passenger_count, origin_name, origin_lat, origin_lng, destination_name, price, created_at')
      .eq('status', 'pending')
      .eq('payment_status', 'paid')
      .is('pilot_id', null)
      .gte('created_at', cutoff)
      .order('created_at', { ascending: false })
      .limit(10);
    if (!data) return;

    const candidates = (data as PendingRide[])
      .filter((r) => !dismissed.has(r.id))
      .filter((r) => r.passenger_count <= availableSeats);

    if (pilotLat != null && pilotLng != null) {
      const withDistance = candidates
        .filter((r) => r.origin_lat != null && r.origin_lng != null)
        .map((r) => ({
          ...r,
          distance: haversineMeters(pilotLat, pilotLng, r.origin_lat as number, r.origin_lng as number),
        }))
        .filter((r) => r.distance <= MAX_DISTANCE_M)
        .sort((a, b) => a.distance - b.distance);
      setPending(withDistance[0] ?? null);
    } else {
      setPending(candidates[0] ?? null);
    }
  }, [pilotProfileId, availableSeats, pilotLat, pilotLng, dismissed]);

  useEffect(() => {
    fetchNearbyPending();
    const interval = setInterval(fetchNearbyPending, 15_000);
    return () => clearInterval(interval);
  }, [fetchNearbyPending]);

  const handleAccept = async () => {
    if (!pending || !pilotProfileId || !pilotUserId) return;
    setAccepting(true);
    const { data, error } = await supabase.rpc('accept_pool_ride', {
      p_ride_id: pending.id,
      p_pilot_id: pilotProfileId,
      p_pilot_user_id: pilotUserId,
      p_pilot_name: pilotName,
      p_pilot_phone: pilotPhone,
    });
    setAccepting(false);
    if (error) {
      toast.error('Erro ao aceitar: ' + error.message);
      return;
    }
    const result = Array.isArray(data) ? data[0] : data;
    if (!result?.success) {
      toast.error(result?.message ?? 'Nao foi possivel aceitar essa corrida');
      return;
    }
    toast.success('Passageiro adicionado a rota');
    setDismissed((prev) => new Set(prev).add(pending.id));
    setPending(null);
    onAccepted?.();
  };

  const handleDismiss = () => {
    if (!pending) return;
    setDismissed((prev) => new Set(prev).add(pending.id));
    setPending(null);
  };

  if (!pending) return null;

  const distance = pilotLat != null && pilotLng != null && pending.origin_lat != null && pending.origin_lng != null
    ? haversineMeters(pilotLat, pilotLng, pending.origin_lat, pending.origin_lng)
    : null;

  return (
    <div className="fixed left-3 right-3 bottom-24 z-40 bg-card border-2 border-primary rounded-2xl p-4 shadow-lg">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-primary/15 rounded-xl flex items-center justify-center shrink-0">
          <Users className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold text-primary uppercase tracking-widest">
            Nova solicitacao na rota
          </p>
          <p className="font-semibold text-foreground text-sm mt-0.5">
            {pending.passenger_name ?? 'Passageiro'} • {pending.passenger_count}{pending.passenger_count > 1 ? ' pessoas' : ' pessoa'}
          </p>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{pending.origin_name ?? '—'}</span>
            {distance != null && (
              <span className="text-primary font-medium ml-1">• {fmtDistance(distance)}</span>
            )}
          </p>
          <p className="text-xs text-success font-semibold mt-1">
            +R$ {Number(pending.price).toFixed(2).replace('.', ',')}
          </p>
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <button
          onClick={handleDismiss}
          disabled={accepting}
          className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold text-muted-foreground flex items-center justify-center gap-1.5"
        >
          <X className="w-4 h-4" />
          Recusar
        </button>
        <button
          onClick={handleAccept}
          disabled={accepting}
          className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center gap-1.5"
        >
          {accepting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          Aceitar
        </button>
      </div>
    </div>
  );
};

export default PoolMidRideNotice;
