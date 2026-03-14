import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Navigation, MapPin, Users, Tag, QrCode, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import GoogleMapView from '@/components/GoogleMapView';
import { locations } from '@/data/mockData';
import { useApp } from '@/contexts/AppContext';
import { useAuthContext } from '@/contexts/AuthContext';
import { useReferral } from '@/hooks/useReferral';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import PaymentModal from '@/components/PaymentModal';
import ProfileIncompleteModal from '@/components/ProfileIncompleteModal';
import { validatePassengerProfile } from '@/utils/profileValidation';
import { safeDbOperation, getFriendlyErrorMessage } from '@/utils/retryOperation';

const RequestRide = () => {
  const navigate = useNavigate();
  const {
    origin,
    setOrigin,
    destination,
    setDestination,
    calculatePrice,
    calculateDistance,
    calculateTime,
  } = useApp();
  const { user, passengerProfile } = useAuthContext();
  const { hasDiscount, activeDiscount, useDiscount } = useReferral(user?.id);

  const [showOriginPicker, setShowOriginPicker] = useState(false);
  const [showDestinationPicker, setShowDestinationPicker] = useState(!destination && !!origin);
  const [passengerCount, setPassengerCount] = useState(1);
  const [isCreating, setIsCreating] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [currentRideId, setCurrentRideId] = useState<string | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'card'>('pix');

  // Piers de Zona A (PASSARELA, JACARÉ, INVASÃO) — preço promocional R$10 (era R$13)
  const ZONE_A_PIERS = new Set(['7', '18', '19']);
  const isPromoRoute = !!(origin && destination && (ZONE_A_PIERS.has(origin.id) || ZONE_A_PIERS.has(destination.id)));
  const PROMO_ORIGINAL_PRICE = 13;

  const canConfirm = origin && destination;
  const pricePerPerson = calculatePrice();
  const baseTotal = pricePerPerson * passengerCount;
  // Apply referral discount (30% off) if available
  const discountMultiplier = hasDiscount && activeDiscount
    ? 1 - Math.max(0, Math.min(100, activeDiscount.discount_percent)) / 100
    : 1;
  const totalPrice = Math.ceil(baseTotal * discountMultiplier);
  const distance = calculateDistance();
  const time = calculateTime();

  const handleConfirm = async (method: 'pix' | 'card') => {
    if (!origin || !destination || !user) {
      toast.error('Dados incompletos');
      return;
    }
    setPaymentMethod(method);

    // Validate passenger profile
    const validation = validatePassengerProfile(passengerProfile);
    if (!validation.isValid) {
      setMissingFields(validation.missingFields);
      setShowProfileModal(true);
      return;
    }

    setIsCreating(true);
    try {
      const { data: result, error: opError } = await safeDbOperation(async () => {
        const { data: rideData, error: rideError } = await supabase
          .from('rides')
          .insert({
            origin_name: origin.name,
            origin_address: origin.address,
            origin_lat: origin.coordinates[1],
            origin_lng: origin.coordinates[0],
            origin_pier_id: origin.id,
            destination_name: destination.name,
            destination_address: destination.address,
            destination_lat: destination.coordinates[1],
            destination_lng: destination.coordinates[0],
            destination_pier_id: destination.id,
            price: totalPrice,
            passenger_count: passengerCount,
            estimated_time: time,
            passenger_device_id: user.id,
            passenger_user_id: user.id,
            passenger_name: passengerProfile?.full_name,
            passenger_phone: passengerProfile?.phone,
            status: 'pending',
            payment_status: 'pending',
          })
          .select()
          .single();

        if (rideError) throw rideError;
        return rideData;
      }, { maxAttempts: 3 });

      if (opError) {
        toast.error(opError);
        return;
      }

      if (result) {
        setCurrentRideId(result.id);
        setPaymentMethod(method);
        setShowPaymentModal(true);
      }
    } catch (error) {
      console.error('Error creating ride:', error);
      toast.error(getFriendlyErrorMessage(error));
    } finally {
      setIsCreating(false);
    }
  };

  const handlePaymentComplete = async () => {
    if (!currentRideId) return;

    try {
      const { error } = await safeDbOperation(async () => {
        const { error: updateError } = await supabase
          .from('rides')
          .update({ payment_status: 'paid' })
          .eq('id', currentRideId);
        if (updateError) throw updateError;
      });

      if (error) {
        toast.error(error);
        return;
      }

      // Consume the referral discount if it was applied
      if (hasDiscount && activeDiscount) {
        await useDiscount(activeDiscount.id, currentRideId);
      }

      setShowPaymentModal(false);
      toast.success('Pagamento confirmado! Buscando piloto...');
      navigate('/passenger/searching');
    } catch (error) {
      console.error('Error updating payment status:', error);
      toast.error(getFriendlyErrorMessage(error));
    }
  };

  const handlePaymentCancel = async () => {
    if (currentRideId) {
      const { error } = await supabase
        .from('rides')
        .update({ status: 'cancelled' })
        .eq('id', currentRideId);
      if (error) {
        toast.error('Erro ao cancelar corrida. Tente novamente.');
        return;
      }
    }
    setShowPaymentModal(false);
    setCurrentRideId(null);
  };

  return (
    <div className="h-screen h-[100dvh] bg-background relative overflow-hidden">
      {/* Map */}
      <div className="absolute inset-0">
        <GoogleMapView
          showBoats={false}
          selectedLocation={origin || destination}
          origin={origin}
          destination={destination}
          routePhase="preview"
        />
      </div>

      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-30 p-4 safe-area-top">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/passenger')}
          className="bg-card shadow-md rounded-full"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
      </header>

      {/* Location inputs card */}
      <div className="absolute top-16 left-4 right-4 z-30 safe-area-top">
        <div className="bg-card rounded-xl shadow-lg p-4">
          {/* Origin */}
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-success shrink-0" />
            <button
              onClick={() => {
                setShowOriginPicker(true);
                setShowDestinationPicker(false);
              }}
              className="flex-1 text-left min-w-0 py-1"
            >
              {origin ? (
                <div>
                  <p className="font-medium text-foreground text-sm truncate">{origin.name}</p>
                </div>
              ) : (
                <p className="text-muted text-sm">Onde você está?</p>
              )}
            </button>
          </div>

          {/* Divider */}
          <div className="ml-1.5 my-2 flex items-center gap-2">
            <div className="w-px h-6 bg-border" />
          </div>

          {/* Destination */}
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-foreground shrink-0" />
            <button
              onClick={() => {
                setShowDestinationPicker(true);
                setShowOriginPicker(false);
              }}
              className="flex-1 text-left min-w-0 py-1"
            >
              {destination ? (
                <div>
                  <p className="font-medium text-foreground text-sm truncate">{destination.name}</p>
                </div>
              ) : (
                <p className="text-muted text-sm">Para onde vai?</p>
              )}
            </button>
          </div>
        </div>

        {/* Location picker dropdown */}
        {(showOriginPicker || showDestinationPicker) && (
          <div className="mt-2 bg-card rounded-xl shadow-lg max-h-64 overflow-y-auto animate-scale-in">
            <div className="p-2">
              {locations
                .filter((loc) => showOriginPicker ? loc.id !== destination?.id : loc.id !== origin?.id)
                .map((location) => (
                  <button
                    key={location.id}
                    onClick={() => {
                      if (showOriginPicker) {
                        setOrigin(location);
                        setShowOriginPicker(false);
                        if (!destination) setShowDestinationPicker(true);
                      } else {
                        setDestination(location);
                        setShowDestinationPicker(false);
                      }
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/5 active:bg-muted/10 transition-colors"
                  >
                    <div className="w-10 h-10 bg-muted/10 rounded-full flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-muted" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-foreground text-sm">{location.name}</p>
                      <p className="text-xs text-muted">{location.address}</p>
                    </div>
                    <span className="text-xs text-muted">{location.estimatedTime}</span>
                  </button>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom section - Trip confirmation */}
      {canConfirm && !showOriginPicker && !showDestinationPicker && (
        <div className="absolute bottom-0 left-0 right-0 z-30 bg-card rounded-t-3xl animate-slide-up" style={{ boxShadow: '0 -4px 32px rgba(0,0,0,0.15)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 bg-border rounded-full" />
          </div>

          <div className="px-4 pb-5 pt-2 space-y-3">
            {/* Passenger count + trip stats row */}
            <div className="flex items-center gap-3">
              {/* Passenger counter */}
              <div className="flex-1 flex items-center justify-between bg-background border border-border rounded-2xl px-3 py-2.5">
                <div className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">Passageiros</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => setPassengerCount(Math.max(1, passengerCount - 1))}
                    className="w-6 h-6 rounded-full border border-border bg-card flex items-center justify-center font-bold text-foreground active:scale-90 transition-transform disabled:opacity-30 cursor-pointer text-sm"
                    disabled={passengerCount <= 1}
                  >
                    −
                  </button>
                  <span className="w-4 text-center font-bold text-sm">{passengerCount}</span>
                  <button
                    onClick={() => setPassengerCount(Math.min(16, passengerCount + 1))}
                    className="w-6 h-6 rounded-full border border-border bg-card flex items-center justify-center font-bold text-foreground active:scale-90 transition-transform disabled:opacity-30 cursor-pointer text-sm"
                    disabled={passengerCount >= 16}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Time + Distance pills */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1 bg-muted/20 rounded-lg px-2 py-1">
                  <Clock className="w-3 h-3 text-primary shrink-0" />
                  <span className="text-xs font-semibold text-foreground">{time} min</span>
                </div>
                <div className="flex items-center gap-1 bg-muted/20 rounded-lg px-2 py-1">
                  <Navigation className="w-3 h-3 text-primary shrink-0" />
                  <span className="text-xs font-semibold text-foreground">{distance.toFixed(1)} km</span>
                </div>
              </div>
            </div>

            {/* Price row */}
            <div className="flex items-center justify-between bg-background border border-border rounded-2xl px-4 py-2.5">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Valor estimado</p>
                {hasDiscount && activeDiscount && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <Tag className="w-3 h-3 text-success" />
                    <span className="text-xs text-success font-semibold">{activeDiscount.discount_percent}% off indicação</span>
                  </div>
                )}
                {isPromoRoute && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <Tag className="w-3 h-3 text-warning" />
                    <span className="text-xs text-warning font-semibold">Preço promocional</span>
                  </div>
                )}
              </div>
              <div className="text-right">
                {(hasDiscount && activeDiscount) && (
                  <p className="text-xs text-muted-foreground line-through">R${baseTotal.toFixed(0)}</p>
                )}
                {isPromoRoute && (
                  <p className="text-xs text-muted-foreground line-through">R${(PROMO_ORIGINAL_PRICE * passengerCount).toFixed(0)}</p>
                )}
                <p className={`text-xl font-bold ${isPromoRoute ? 'text-warning' : hasDiscount ? 'text-success' : 'text-foreground'}`}>
                  R${totalPrice.toFixed(0)}
                </p>
                {passengerCount > 1 && (
                  <p className="text-xs text-muted-foreground">{passengerCount}x R${pricePerPerson.toFixed(0)}</p>
                )}
              </div>
            </div>

            {/* Payment method — two buttons */}
            {currentRideId ? (
              <Button
                variant="default"
                size="lg"
                fullWidth
                onClick={() => setShowPaymentModal(true)}
                className="h-12 text-sm font-bold rounded-2xl"
              >
                Continuar para Pagamento
              </Button>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground text-center font-medium">Como você prefere pagar?</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="default"
                    size="lg"
                    fullWidth
                    onClick={() => handleConfirm('pix')}
                    disabled={isCreating}
                    className="h-12 text-sm font-bold rounded-2xl gap-2"
                  >
                    <QrCode className="w-4 h-4 shrink-0" />
                    PIX
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    fullWidth
                    onClick={() => handleConfirm('card')}
                    disabled={isCreating}
                    className="h-12 text-sm font-bold rounded-2xl gap-2"
                  >
                    <CreditCard className="w-4 h-4 shrink-0" />
                    Cartão
                  </Button>
                </div>
                {isCreating && (
                  <p className="text-xs text-muted-foreground text-center animate-pulse">Gerando cobrança...</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={handlePaymentCancel}
        onPaymentComplete={handlePaymentComplete}
        rideId={currentRideId || ''}
        amount={totalPrice}
        initialTab={paymentMethod}
        passengerDeviceId={user?.id || ''}
        passengerName={passengerProfile?.full_name || ''}
        passengerCpf={passengerProfile?.cpf || ''}
        passengerEmail={passengerProfile?.email || ''}
      />

      {/* Profile Incomplete Modal */}
      <ProfileIncompleteModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        onGoToProfile={() => {
          setShowProfileModal(false);
          navigate('/passenger/profile');
        }}
        missingFields={missingFields}
        userType="passenger"
      />
    </div>
  );
};

export default RequestRide;
