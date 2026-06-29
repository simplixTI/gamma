import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Pilotos so contam como online se atualizaram GPS nos ultimos 2 minutos.
// Sem isso, zumbis (piloto matou o app sem clicar offline) ficam aparecendo
// para sempre porque o cleanup do React nao roda em kill abrupto.
const STALE_THRESHOLD_MS = 120_000;

export interface PilotLocation {
  pilot_id: string;
  lat: number;
  lng: number;
  is_available: boolean;
  updated_at?: string;
}

const isFresh = (updatedAt?: string): boolean => {
  if (!updatedAt) return false;
  return Date.now() - new Date(updatedAt).getTime() < STALE_THRESHOLD_MS;
};

export const usePilotLocations = (isActive: boolean) => {
  const [pilotLocations, setPilotLocations] = useState<PilotLocation[]>([]);

  useEffect(() => {
    if (!isActive) {
      setPilotLocations([]);
      return;
    }

    const fetchLocations = async () => {
      const cutoff = new Date(Date.now() - STALE_THRESHOLD_MS).toISOString();
      const { data } = await supabase
        .from('locations')
        .select('pilot_id, lat, lng, is_available, updated_at')
        .eq('is_available', true)
        .gte('updated_at', cutoff);
      if (data) setPilotLocations(data as PilotLocation[]);
    };

    fetchLocations();

    // Re-filtra zumbis localmente a cada 30s — protege contra rows que
    // nao recebem update via realtime (piloto desapareceu sem cleanup).
    const sweepInterval = setInterval(() => {
      setPilotLocations((prev) => prev.filter((p) => isFresh(p.updated_at)));
    }, 30_000);

    const channel = supabase
      .channel(`pilot-locations-map-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'locations' }, (payload) => {
        if (payload.eventType === 'DELETE') {
          const old = payload.old as PilotLocation;
          setPilotLocations((prev) => prev.filter((p) => p.pilot_id !== old.pilot_id));
          return;
        }
        const loc = payload.new as PilotLocation;
        setPilotLocations((prev) => {
          if (!loc.is_available || !isFresh(loc.updated_at)) {
            return prev.filter((p) => p.pilot_id !== loc.pilot_id);
          }
          const idx = prev.findIndex((p) => p.pilot_id === loc.pilot_id);
          if (idx >= 0) {
            const updated = [...prev];
            updated[idx] = loc;
            return updated;
          }
          return [...prev, loc];
        });
      })
      .subscribe();

    return () => {
      clearInterval(sweepInterval);
      supabase.removeChannel(channel);
    };
  }, [isActive]);

  return pilotLocations;
};
