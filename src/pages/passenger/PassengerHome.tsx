import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Clock, ChevronRight, Gift, History, MapPin, Zap } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { useAuthContext } from '@/contexts/AuthContext';
import { useReferral } from '@/hooks/useReferral';
import { getCurrentRide } from '@/services/rideService';
import { supabase } from '@/integrations/supabase/client';
import { locations } from '@/data/mockData';
import { DbRide } from '@/types';
import ActiveRideCard from '@/components/ActiveRideCard';
import SimplixFooter from '@/components/SimplixFooter';
import Logo from '@/components/Logo';

const PassengerHome = () => {
  const navigate = useNavigate();
  const { setOrigin, setDestination, setCurrentPilot, setRideStatus } = useApp();
  const { user, passengerProfile } = useAuthContext();
  const { hasDiscount, pendingDiscounts } = useReferral(user?.id);
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
          coordinates: [ride.origin_lng, ride.origin_lat],
        });
        setDestination({
          id: 'destination',
          name: ride.destination_name || 'Destino',
          address: ride.destination_address || '',
          coordinates: [ride.destination_lng || 0, ride.destination_lat || 0],
        });
        if (ride.pilot_id) {
          let pilotRating = 4.9;
          const { data: pp } = await supabase
            .from('pilot_profiles')
            .select('rating')
            .eq('user_id', ride.pilot_id)
            .maybeSingle();
          if (pp?.rating) pilotRating = pp.rating;

          setCurrentPilot({
            id: ride.pilot_id,
            name: ride.pilot_name || 'Piloto',
            photo: '/placeholder.svg',
            rating: pilotRating,
            boat: 'Lancha Rápida',
            phone: ride.pilot_phone || '',
          });
        }
        if (ride.status === 'pending') setRideStatus('searching');
        else if (ride.status === 'accepted') setRideStatus('matched');
        else if (ride.status === 'pilot_arriving') setRideStatus('arriving');
        else if (ride.status === 'in_progress') setRideStatus('in_progress');
        else setRideStatus('idle');
      } catch (error) {
        console.error('Erro ao buscar corrida:', error);
      }
    };

    checkOngoingRide();
    const interval = setInterval(checkOngoingRide, 5000);
    return () => clearInterval(interval);
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

        {/* Destinos frequentes */}
        <section>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 px-1">
            Destinos frequentes
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

        {/* Banner principal de parceiro */}
        <section>
          <div className="rounded-2xl overflow-hidden border border-primary/15 bg-gradient-to-br from-primary/8 via-primary/5 to-accent/5">
            <div className="h-28 bg-gradient-to-br from-primary/15 to-accent/10 flex items-center justify-center relative overflow-hidden">
              {/* Decorative wave */}
              <div className="absolute inset-0 opacity-20">
                <svg viewBox="0 0 400 100" className="w-full h-full" preserveAspectRatio="none">
                  <path d="M0,50 C100,20 200,80 300,50 C350,35 375,45 400,50 L400,100 L0,100 Z" fill="hsl(var(--primary))" />
                </svg>
              </div>
              <svg className="w-12 h-12 text-primary/50" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 21c-1.39 0-2.78-.47-4-1.32-2.44 1.71-5.56 1.71-8 0C6.78 20.53 5.39 21 4 21H2v2h2c1.25 0 2.45-.2 3.57-.57a9.9 9.9 0 007.86 0C16.55 22.8 17.75 23 19 23h3v-2h-2zM3.95 19H4c1.6 0 3.02-.88 4-2 .98 1.12 2.4 2 4 2s3.02-.88 4-2c.98 1.12 2.4 2 4 2h.05l1.89-6.68c.08-.26.06-.54-.06-.79l-1.2-2.4C20.4 8.51 20 7.77 20 7V6c0-1.1-.9-2-2-2h-1V1h-2v3H9V1H7v3H6C4.9 4 4 4.9 4 6v1c0 .77-.4 1.51-.63 2.13l-1.2 2.4a1 1 0 00-.06.79L3.95 19z"/>
              </svg>
            </div>
            <div className="p-4">
              <p className="font-bold text-foreground text-sm">Feito para a Ilha de Gigoia</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Este espaço será ocupado por anúncios de parceiros locais. Em breve!
              </p>
            </div>
          </div>
        </section>

        {/* Banner secundário de parceiro */}
        <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-muted/20 flex items-center justify-center shrink-0">
            <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 2.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-foreground text-sm">Espaço para parceiros</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Restaurantes, lojas e serviços da ilha
            </p>
          </div>
        </div>

        <SimplixFooter />
      </div>

      {/* ── Bottom tab bar ── */}
      <nav
        className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-center">
          {/* Início */}
          <button className="flex-1 flex flex-col items-center py-3 gap-1 text-primary cursor-pointer">
            <div className="relative">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
              </svg>
              <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
            </div>
            <span className="text-[10px] font-semibold">Início</span>
          </button>

          {/* Atividade */}
          <button
            className="flex-1 flex flex-col items-center py-3 gap-1 text-muted-foreground active:text-foreground transition-colors cursor-pointer"
            onClick={() => navigate('/passenger/history')}
          >
            <History className="w-5 h-5" />
            <span className="text-[10px] font-medium">Atividade</span>
          </button>

          {/* Conta */}
          <button
            className="flex-1 flex flex-col items-center py-3 gap-1 text-muted-foreground active:text-foreground transition-colors cursor-pointer"
            onClick={() => navigate('/passenger/profile')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
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
