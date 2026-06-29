import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Clock, ChevronRight, History, MapPin, Zap } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { useAuthContext } from '@/contexts/AuthContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { getCurrentRide } from '@/services/rideService';
import { supabase } from '@/integrations/supabase/client';
import { locations } from '@/data/mockData';
import { DbRide } from '@/types';
import ActiveRideCard from '@/components/ActiveRideCard';
import SimplixFooter from '@/components/SimplixFooter';
import Logo from '@/components/Logo';
import AdDisplay from '@/components/AdDisplay';
import NearbyBoatsCard from '@/components/NearbyBoatsCard';

const PassengerHome = () => {
  const navigate = useNavigate();
  const { setOrigin, setDestination, setCurrentPilot, setRideStatus } = useApp();
  const { user, passengerProfile } = useAuthContext();
  usePushNotifications(user?.id);
  const [activeRide, setActiveRide] = useState<DbRide | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    const checkOngoingRide = async () => {
      try {
        const ride = await getCurrentRide(user.id);
        if (!ride) {
          setActiveRide(null);
          setRideStatus('idle');
          return;
        }
        setActiveRide(ride as DbRide);
        setOrigin({
          id: 'origin',
          name: ride.origin_name,
          address: ride.origin_address || '',
          coordinates: (ride.origin_lng != null && ride.origin_lat != null)
            ? [ride.origin_lng, ride.origin_lat]
            : [0, 0],
        });
        setDestination({
          id: 'destination',
          name: ride.destination_name || 'Destino',
          address: ride.destination_address || '',
          coordinates: (ride.destination_lng != null && ride.destination_lat != null)
            ? [ride.destination_lng, ride.destination_lat]
            : [0, 0],
        });
        if (ride.pilot_id) {
          const { data: pp } = await supabase
            .from('pilot_profiles')
            .select('rating, photo_url, boat_type, boat_identification, boat_color')
            .eq('id', ride.pilot_id)
            .maybeSingle();

          setCurrentPilot({
            id: ride.pilot_id,
            name: ride.pilot_name || 'Piloto',
            photo: pp?.photo_url || '',
            rating: pp?.rating || 4.9,
            boat: pp?.boat_identification || pp?.boat_type || 'Barco',
            boatType: pp?.boat_type ?? undefined,
            boatColor: pp?.boat_color ?? undefined,
            phone: ride.pilot_phone || '',
          });
        }
        // Auto-redirect to the correct screen based on ride state
        if (ride.status === 'pending') {
          if ((ride as any).payment_status === 'paid') {
            // Paid but waiting for pilot — go to searching
            navigate('/passenger/searching', { state: { rideId: ride.id } });
            return;
          }
          // Not paid yet — go to request page to show payment modal
          setRideStatus('searching');
          navigate('/passenger/request', { state: { rideId: ride.id } });
          return;
        } else if (ride.status === 'accepted' || ride.status === 'pilot_arriving') {
          navigate('/passenger/tracking', { state: { rideId: ride.id } });
          return;
        } else if (ride.status === 'in_progress') {
          navigate('/passenger/in-ride', { state: { rideId: ride.id } });
          return;
        }
        setRideStatus('idle');
      } catch (error) {
        console.error('Erro ao buscar corrida:', error);
      }
    };

    checkOngoingRide();
    // Only poll while user is logged in and a ride may be active
    const interval = setInterval(() => {
      // Guard: skip poll if user logged out (stale closure protection)
      if (!user?.id) {
        clearInterval(interval);
        return;
      }
      checkOngoingRide();
    }, 5000);
    return () => {
      clearInterval(interval);
    };
  }, [user?.id, setOrigin, setDestination, setCurrentPilot, setRideStatus]);

  const handleRideCancelled = () => {
    setActiveRide(null);
    setRideStatus('idle');
  };

  const handleLocationSelect = (location: typeof locations[0]) => {
    setOrigin(location);
    navigate('/passenger/request');
  };

  const firstName = passengerProfile?.full_name?.split(' ')[0] || null;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

  return (
    <div className="min-h-screen min-h-[100dvh] bg-background flex flex-col">

      {/* ── Header ── */}
      <header
        className="bg-card border-b border-border px-5 pb-4"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 16px)' }}
      >
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1.5">
            <Logo size="md" variant="default" />
            <p className="text-muted-foreground text-sm">
              {greeting},{' '}
              <span className="font-semibold text-foreground">
                {firstName ?? 'Passageiro'}
              </span>
            </p>
          </div>

          {/* Avatar */}
          <button
            onClick={() => navigate('/passenger/profile')}
            className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-primary/30 active:opacity-70 shrink-0"
            style={{ boxShadow: '0 0 0 3px hsl(var(--primary) / 0.12)' }}
          >
            {passengerProfile?.photo_url ? (
              <img
                src={passengerProfile.photo_url}
                alt="Perfil"
                className="w-full h-full object-cover"
                loading="lazy"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                <span className="text-lg font-bold text-primary">
                  {firstName?.[0]?.toUpperCase() ?? '?'}
                </span>
              </div>
            )}
          </button>
        </div>
      </header>

      {/* ── Search bar — faixa dedicada abaixo do header ── */}
      <div className="bg-card px-4 pt-3 pb-4 border-b border-border">
        <button
          onClick={() => navigate('/passenger/request')}
          className="w-full flex items-center gap-3 bg-background border border-border rounded-2xl px-4 py-3.5 text-left active:scale-[0.99] transition-transform cursor-pointer"
          style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}
        >
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Search className="w-4 h-4 text-primary" />
          </div>
          <span className="text-muted-foreground font-medium flex-1 text-base">
            Para onde?
          </span>
          <div className="flex items-center gap-1.5 bg-primary/8 border border-primary/20 rounded-full px-3 py-1.5">
            <Clock className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-semibold text-primary">Agora</span>
          </div>
        </button>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto pb-24 space-y-4 pt-4 px-4">

        {/* Corrida ativa */}
        {activeRide && (
          <section>
            <p className="text-xs font-bold text-primary uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <Zap className="w-3 h-3" />
              Corrida em andamento
            </p>
            <ActiveRideCard
              ride={activeRide}
              userType="passenger"
              onCancelled={handleRideCancelled}
            />
          </section>
        )}

        {/* Barcos online agora */}
        <NearbyBoatsCard />

        {/* Pontos populares */}
        <section>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 px-1">
            Pontos populares
          </p>
          <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
            {locations.slice(0, 3).map((location, idx) => (
              <button
                key={location.id}
                onClick={() => handleLocationSelect(location)}
                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/30 active:bg-muted/50 transition-colors cursor-pointer text-left"
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  idx === 0 ? 'bg-primary/10' : idx === 1 ? 'bg-accent/10' : 'bg-muted/30'
                }`}>
                  <MapPin className={`w-4 h-4 ${
                    idx === 0 ? 'text-primary' : idx === 1 ? 'text-accent' : 'text-muted-foreground'
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground text-sm">{location.name}</p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{location.address}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/50 shrink-0" />
              </button>
            ))}
          </div>
        </section>

        {/* Anúncios de parceiros */}
        <AdDisplay position="home" />

        <SimplixFooter />
      </div>

      {/* ── Bottom tab bar ── floating ocean dock */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="relative bg-gradient-to-b from-[#0b2a44] to-[#061a2c] rounded-t-3xl shadow-[0_-12px_32px_-8px_rgba(0,40,80,0.45)]">
          <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/50 to-transparent" />

          <div className="flex items-center px-2 pt-2">
            {/* Início (active) */}
            <button
              className="group relative flex-1 flex flex-col items-center gap-1 py-2.5 active:scale-95 transition-transform"
              onClick={() => navigate('/passenger')}
              aria-label="Início"
            >
              <span className="absolute inset-x-4 inset-y-1 rounded-2xl bg-cyan-400/15 ring-1 ring-cyan-300/30 shadow-[0_0_24px_-4px_rgba(34,211,238,0.55)]" />
              <svg className="relative w-5 h-5 text-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.55)]" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
              </svg>
              <span className="relative text-[10px] font-semibold text-cyan-50 tracking-wide">Início</span>
            </button>

            {/* Atividade */}
            <button
              className="flex-1 flex flex-col items-center gap-1 py-2.5 text-white/55 hover:text-white active:scale-95 transition-all"
              onClick={() => navigate('/passenger/history')}
              aria-label="Atividade"
            >
              <History className="w-5 h-5" aria-hidden="true" />
              <span className="text-[10px] font-medium tracking-wide">Atividade</span>
            </button>

            {/* Conta */}
            <button
              className="flex-1 flex flex-col items-center gap-1 py-2.5 text-white/55 hover:text-white active:scale-95 transition-all"
              onClick={() => navigate('/passenger/profile')}
              aria-label="Conta"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
              </svg>
              <span className="text-[10px] font-medium tracking-wide">Conta</span>
            </button>
          </div>
        </div>
      </nav>
    </div>
  );
};

export default PassengerHome;
