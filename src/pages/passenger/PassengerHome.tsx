import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Clock, ChevronRight, Gift, History, MapPin, Zap } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { useAuthContext } from '@/contexts/AuthContext';
import { useReferral } from '@/hooks/useReferral';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { getCurrentRide } from '@/services/rideService';
import { supabase } from '@/integrations/supabase/client';
import { locations } from '@/data/mockData';
import { DbRide } from '@/types';
import ActiveRideCard from '@/components/ActiveRideCard';
import SimplixFooter from '@/components/SimplixFooter';
import Logo from '@/components/Logo';
import AdDisplay from '@/components/AdDisplay';
import NearestDeckCard from '@/components/NearestDeckCard';
import NearbyBoatsCard from '@/components/NearbyBoatsCard';

const PassengerHome = () => {
  const navigate = useNavigate();
  const { setOrigin, setDestination, setCurrentPilot, setRideStatus } = useApp();
  const { user, passengerProfile } = useAuthContext();
  const { hasDiscount, pendingDiscounts } = useReferral(user?.id);
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
          let pilotRating = 4.9;
          const { data: pp } = await supabase
            .from('pilot_profiles')
            .select('rating')
            .eq('id', ride.pilot_id)
            .maybeSingle();
          if (pp?.rating) pilotRating = pp.rating;

          setCurrentPilot({
            id: ride.pilot_id,
            name: ride.pilot_name || 'Piloto',
            photo: '',
            rating: pilotRating,
            boat: 'Lancha Rápida',
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

        {/* Banner de desconto de indicação */}
        {hasDiscount && (() => {
          const nextExpiry = pendingDiscounts[0]?.expires_at;
          const daysLeft = nextExpiry
            ? Math.max(0, Math.ceil((new Date(nextExpiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
            : null;
          return (
            <button
              onClick={() => navigate('/passenger/referral')}
              className="w-full flex items-center gap-3 bg-success/8 border border-success/25 rounded-2xl px-4 py-3.5 text-left active:opacity-80 cursor-pointer"
            >
              <div className="w-10 h-10 bg-success/15 rounded-xl flex items-center justify-center shrink-0">
                <Gift className="w-5 h-5 text-success" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground text-sm">
                  {pendingDiscounts.length}x desconto de 30% disponível!
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {daysLeft !== null
                    ? daysLeft === 0
                      ? 'Expira hoje — use agora!'
                      : `Válido por mais ${daysLeft} dia${daysLeft !== 1 ? 's' : ''}`
                    : 'Aplicado automaticamente na próxima corrida'}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </button>
          );
        })()}

        {/* Localização atual + deck mais próximo */}
        <NearestDeckCard
          onUseAsOrigin={(deck) => {
            setOrigin(deck);
            navigate('/passenger/request');
          }}
        />

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

      {/* ── Bottom tab bar ── */}
      <nav
        className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-center">
          {/* Início */}
          <button className="flex-1 flex flex-col items-center py-3 gap-1 text-primary" onClick={() => navigate('/passenger')} aria-label="Início">
            <div className="relative">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
              </svg>
            </div>
            <span className="text-[10px] font-semibold">Início</span>
            <span className="w-4 h-0.5 rounded-full bg-primary" />
          </button>

          {/* Atividade */}
          <button
            className="flex-1 flex flex-col items-center py-3 gap-1 text-muted-foreground active:text-foreground transition-colors"
            onClick={() => navigate('/passenger/history')}
            aria-label="Atividade"
          >
            <History className="w-5 h-5" aria-hidden="true" />
            <span className="text-[10px] font-medium">Atividade</span>
          </button>

          {/* Conta */}
          <button
            className="flex-1 flex flex-col items-center py-3 gap-1 text-muted-foreground active:text-foreground transition-colors"
            onClick={() => navigate('/passenger/profile')}
            aria-label="Conta"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
            </svg>
            <span className="text-[10px] font-medium">Conta</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default PassengerHome;
