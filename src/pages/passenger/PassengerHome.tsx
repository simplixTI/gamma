import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Clock, ChevronRight, Gift, History } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { useAuthContext } from '@/contexts/AuthContext';
import { useReferral } from '@/hooks/useReferral';
import { getCurrentRide } from '@/services/rideService';
import { locations } from '@/data/mockData';
import { DbRide } from '@/types';
import ActiveRideCard from '@/components/ActiveRideCard';
import SimplixFooter from '@/components/SimplixFooter';

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
          setCurrentPilot({
            id: ride.pilot_id,
            name: ride.pilot_name || 'Piloto',
            photo: '/placeholder.svg',
            rating: 4.9,
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
      {/* Top bar */}
      <header className="flex items-center justify-between px-5 pt-14 pb-5 safe-area-top bg-primary">
        <div>
          <p className="text-primary-foreground/70 text-sm">{greeting},</p>
          <h1 className="text-2xl font-bold text-primary-foreground leading-tight">
            {firstName ?? 'Passageiro'}
          </h1>
        </div>
        <button
          onClick={() => navigate('/passenger/profile')}
          className="w-11 h-11 rounded-full bg-primary-foreground/20 flex items-center justify-center overflow-hidden border-2 border-primary-foreground/40 active:opacity-70"
        >
          {passengerProfile?.photo_url ? (
            <img
              src={passengerProfile.photo_url}
              alt="Perfil"
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-lg font-bold text-primary-foreground">
              {firstName?.[0]?.toUpperCase() ?? '?'}
            </span>
          )}
        </button>
      </header>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto pb-24 px-5 space-y-5">

        {/* Active ride */}
        {activeRide && (
          <div>
            <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
              🚤 Corrida em andamento
            </p>
            <ActiveRideCard
              ride={activeRide}
              userType="passenger"
              onCancelled={handleRideCancelled}
            />
          </div>
        )}

        {/* Search bar */}
        <button
          onClick={() => navigate('/passenger/request')}
          className="w-full flex items-center gap-3 bg-card border border-primary/20 rounded-2xl px-4 py-4 text-left active:scale-[0.98] transition-transform shadow-sm"
        >
          <Search className="w-5 h-5 text-primary shrink-0" />
          <span className="text-foreground font-medium flex-1 text-base">Para onde?</span>
          <div className="flex items-center gap-1.5 bg-primary/10 rounded-full px-3 py-1.5">
            <Clock className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-medium text-primary">Agora</span>
          </div>
        </button>

        {/* Referral discount banner — only when has active discount */}
        {hasDiscount && (
          <button
            onClick={() => navigate('/passenger/referral')}
            className="w-full flex items-center gap-3 bg-green-500/10 border border-green-500/30 rounded-2xl px-4 py-3.5 text-left active:opacity-80"
          >
            <div className="w-9 h-9 bg-green-500/20 rounded-xl flex items-center justify-center shrink-0">
              <Gift className="w-4.5 h-4.5 text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground text-sm">
                {pendingDiscounts.length}x desconto de 30% disponível!
              </p>
              <p className="text-xs text-muted">Aplicado automaticamente na próxima corrida</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted shrink-0" />
          </button>
        )}

        {/* Quick destinations — last 3 piers as suggestions */}
        <div>
          <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
            Destinos frequentes
          </p>
          <div className="space-y-1">
            {locations.slice(0, 3).map((location) => (
              <button
                key={location.id}
                onClick={() => handleLocationSelect(location)}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-muted/5 active:bg-muted/10 transition-colors"
              >
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                  <Clock className="w-4.5 h-4.5 text-primary" />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="font-medium text-foreground text-sm">{location.name}</p>
                  <p className="text-xs text-muted truncate">{location.address}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Partner ad banner */}
        <div className="rounded-2xl overflow-hidden">
          <div className="bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 rounded-2xl">
            {/* Placeholder image area */}
            <div className="h-32 bg-primary/10 rounded-t-2xl flex items-center justify-center">
              <span className="text-4xl">🚤</span>
            </div>
            <div className="p-4">
              <p className="font-bold text-foreground text-base">Feito para a Ilha de Gigoia</p>
              <p className="text-sm text-muted mt-1 leading-relaxed">
                Este espaço será ocupado por anúncios de parceiros locais. Em breve!
              </p>
            </div>
          </div>
        </div>

        {/* Second banner slot */}
        <div className="rounded-2xl overflow-hidden">
          <div className="bg-muted/10 border border-border rounded-2xl p-4 flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-muted/20 flex items-center justify-center shrink-0 text-2xl">
              🏪
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-foreground text-sm">Espaço para parceiros</p>
              <p className="text-xs text-muted mt-0.5">
                Restaurantes, lojas e serviços da ilha
              </p>
            </div>
          </div>
        </div>

        <SimplixFooter />
      </div>

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-primary/15 z-50 safe-area-bottom">
        <div className="flex items-center">
          <button className="flex-1 flex flex-col items-center py-3 gap-1 text-primary">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
            </svg>
            <span className="text-[10px] font-semibold">Início</span>
          </button>
          <button
            className="flex-1 flex flex-col items-center py-3 gap-1 text-muted-foreground"
            onClick={() => navigate('/passenger/history')}
          >
            <History className="w-5 h-5" />
            <span className="text-[10px] font-medium">Atividade</span>
          </button>
          <button
            className="flex-1 flex flex-col items-center py-3 gap-1 text-muted-foreground"
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
