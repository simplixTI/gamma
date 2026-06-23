import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Clock, Navigation, MapPin, Users, Tag, QrCode, CreditCard, Search, Wallet, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { DbRide } from '@/types';

const RequestRide = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    origin,
    setOrigin,
    destination,
    setDestination,
    calculatePrice,
    calculateDistance,
    calculateTime,
    setRideStatus,
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
  const [pierSearch, setPierSearch] = useState('');
  const [nearestPierId, setNearestPierId] = useState<string | null>(null);
  const [isRestoringRide, setIsRestoringRide] = useState(false);
  const [activeRidePrice, setActiveRidePrice] = useState<number | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [payingWithWallet, setPayingWithWallet] = useState(false);

  // Load passenger wallet balance to offer "Pay with balance" option
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('passenger_profiles')
      .select('wallet_balance')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        setWalletBalance(Number(data?.wallet_balance ?? 0));
      });
  }, [user?.id]);

  const handleConfirmWithWallet = async () => {
    if (!origin || !destination || !user) {
      toast.error('Dados incompletos');
      return;
    }
    const validation = validatePassengerProfile(passengerProfile);
    if (!validation.isValid) {
      setMissingFields(validation.missingFields);
      setShowProfileModal(true);
      return;
    }
    setPayingWithWallet(true);
    try {
      // Reuse existing pending ride or create one
      let rideIdToPay: string | null = currentRideId;
      if (!rideIdToPay) {
        const { data: activeRide } = await supabase
          .from('rides')
          .select('id')
          .eq('passenger_user_id', user.id)
          .in('status', ['pending', 'accepted', 'pilot_arriving', 'in_progress'])
          .maybeSingle();
        if (activeRide) {
          rideIdToPay = activeRide.id;
        } else {
          const { data: rideData, error: insertErr } = await supabase
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
            .select('id')
            .single();
          if (insertErr) throw insertErr;
          rideIdToPay = rideData.id;
        }
      }

      const { data: result, error: payErr } = await supabase.rpc('pay_ride_with_wallet', {
        p_user_id: user.id,
        p_ride_id: rideIdToPay,
        p_amount: totalPrice,
        p_description: `Corrida de ${origin.name} para ${destination.name}`,
      });
      if (payErr) throw payErr;
      const r = result as { success?: boolean; error?: string; balance?: number } | null;
      if (!r?.success) {
        if (r?.error === 'insufficient_balance') {
          toast.error(`Saldo insuficiente. Você tem R$ ${(r.balance ?? 0).toFixed(2).replace('.', ',')}.`);
        } else {
          toast.error(r?.error || 'Erro ao pagar com saldo');
        }
        return;
      }
      setRideStatus('searching');
      navigate('/passenger/searching', { state: { confirmedPrice: totalPrice } });
    } catch (err) {
      console.error('Pay with wallet error:', err);
      toast.error(getFriendlyErrorMessage(err));
    } finally {
      setPayingWithWallet(false);
    }
  };

  // Restore ride data if navigating from "Retomar" button with rideId
  useEffect(() => {
    const restoreRideData = async () => {
      const rideId = (location.state as any)?.rideId;
      if (!rideId || origin || isRestoringRide) return;

      setIsRestoringRide(true);
      try {
        const { data: ride, error } = await supabase
          .from('rides')
          .select('*')
          .eq('id', rideId)
          .maybeSingle();

        if (error) {
          console.error('Error fetching ride:', error);
          return;
        }

        if (ride) {
          // Restore origin from ride data
          const originLocation = locations.find(loc => loc.id === ride.origin_pier_id);
          if (originLocation) {
            setOrigin(originLocation);
          } else {
            // Fallback if pier ID not in mockData
            setOrigin({
              id: ride.origin_pier_id || 'origin',
              name: ride.origin_name || 'Origem',
              address: ride.origin_address || '',
              coordinates: (ride.origin_lng != null && ride.origin_lat != null)
                ? [ride.origin_lng, ride.origin_lat]
                : [0, 0],
            });
          }

          // Restore destination from ride data
          const destLocation = locations.find(loc => loc.id === ride.destination_pier_id);
          if (destLocation) {
            setDestination(destLocation);
          } else {
            // Fallback if pier ID not in mockData
            setDestination({
              id: ride.destination_pier_id || 'destination',
              name: ride.destination_name || 'Destino',
              address: ride.destination_address || '',
              coordinates: (ride.destination_lng != null && ride.destination_lat != null)
                ? [ride.destination_lng, ride.destination_lat]
                : [0, 0],
            });
          }

          // Restore passenger count from ride
          if (ride.passenger_count && ride.passenger_count > 0) {
            setPassengerCount(ride.passenger_count);
          }

          // Set the current ride ID and price so we can update it instead of creating new
          setCurrentRideId(rideId);
          if (ride.price) setActiveRidePrice(Number(ride.price));
        }
      } catch (error) {
        console.error('Error restoring ride data:', error);
        toast.error('Erro ao restaurar dados da corrida');
      } finally {
        setIsRestoringRide(false);
      }
    };

    restoreRideData();
  }, [location.state, origin, setOrigin, setDestination, isRestoringRide]);

  // Detect nearest pier via GPS on mount (for origin suggestion)
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const userLat = pos.coords.latitude;
        const userLng = pos.coords.longitude;
        let minDist = Infinity;
        let nearest: string | null = null;
        for (const loc of locations) {
          const lat = loc.coordinates[1]; // [lng, lat] format
          const lng = loc.coordinates[0];
          const dLat = (lat - userLat) * Math.PI / 180;
          const dLng = (lng - userLng) * Math.PI / 180;
          const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(userLat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
          const dist = 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); // meters
          if (dist < minDist) { minDist = dist; nearest = loc.id; }
        }
        setNearestPierId(nearest);
      },
      () => { /* GPS denied — no suggestion */ },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
    );
  }, []);

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
  const referralDiscountAmount = baseTotal - Math.ceil(baseTotal * discountMultiplier);
  const totalPrice = Math.max(0, baseTotal - referralDiscountAmount);
  const distance = calculateDistance();
  const time = calculateTime();

  const handleConfirm = async (method: 'pix' | 'card') => {
    if (!origin || !destination || !user) {
      toast.error('Dados incompletos');
      return;
    }
    setPaymentMethod(method);

    // Validate passenger profile BEFORE creating ride to avoid orphaned DB records
    const validation = validatePassengerProfile(passengerProfile);
    if (!validation.isValid) {
      setMissingFields(validation.missingFields);
      setShowProfileModal(true);
      return;
    }

    // If not updating an existing ride, prevent multiple concurrent active rides per user
    if (!currentRideId) {
      const { data: activeRide } = await supabase
        .from('rides')
        .select('id, price, origin_name, destination_name')
        .eq('passenger_user_id', user.id)
        .in('status', ['pending', 'accepted', 'pilot_arriving', 'in_progress'])
        .maybeSingle();
      if (activeRide) {
        // Ride already exists — open payment for it with its stored price
        setCurrentRideId(activeRide.id);
        setActiveRidePrice(activeRide.price);
        setPaymentMethod(method);
        setShowPaymentModal(true);
        return;
      }
    }

    // Fair-split fields: pilot is paid 45% of GROSS regardless of discount source.
    // Vouchers viraram credito direto na carteira — nao entram mais aqui.
    const totalDiscount = baseTotal - totalPrice;
    const anyDiscountApplied = totalDiscount > 0;
    const discountFields = anyDiscountApplied
      ? {
          gross_price: baseTotal,
          discount_amount: totalDiscount,
          referral_discount_id: (hasDiscount && activeDiscount && referralDiscountAmount > 0) ? activeDiscount.id : null,
        }
      : {
          gross_price: null,
          discount_amount: 0,
          referral_discount_id: null,
        };

    setIsCreating(true);
    try {
      const { data: result, error: opError } = await safeDbOperation(async () => {
        // If currentRideId exists, update the existing ride; otherwise create a new one
        if (currentRideId) {
          const { data: updatedRide, error: updateError } = await supabase
            .from('rides')
            .update({
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
              ...discountFields,
              passenger_count: passengerCount,
              estimated_time: time,
              payment_status: 'pending',
            })
            .eq('id', currentRideId)
            .select()
            .single();

          if (updateError) throw updateError;
          return updatedRide;
        } else {
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
              ...discountFields,
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
        }
      }, { maxAttempts: 3 });

      if (opError) {
        toast.error(String(opError));
        return;
      }

      if (result) {
        setCurrentRideId(result.id);
        setPaymentMethod(method);
        setShowPaymentModal(true);
      }
    } catch (error) {
      console.error('Error creating/updating ride:', error);
      toast.error(getFriendlyErrorMessage(error));
    } finally {
      setIsCreating(false);
    }
  };

  const handlePaymentComplete = async () => {
    if (!currentRideId) return;

    // payment_status is set to 'paid' by the Mercado Pago webhook server-side.
    // Client-side update is intentionally omitted to prevent premature/incorrect status.

    // Consume the referral discount if it was applied
    if (hasDiscount && activeDiscount && referralDiscountAmount > 0) {
      try {
        await useDiscount(activeDiscount.id, currentRideId);
      } catch (err) {
        // Non-fatal — discount consumption failure should not block the ride
        console.error('Failed to consume referral discount:', err);
      }
    }

    setShowPaymentModal(false);
    toast.success('Pagamento confirmado! Buscando piloto...');
    navigate('/passenger/searching', { state: { confirmedPrice: totalPrice } });
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
    setRideStatus('idle');
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
          onClick={async () => {
            const rideIdToCancel = currentRideId ?? (location.state as any)?.rideId;
            if (rideIdToCancel) {
              await supabase
                .from('rides')
                .update({ status: 'cancelled' })
                .eq('id', rideIdToCancel)
                .eq('payment_status', 'pending');
            }
            setOrigin(null);
            setDestination(null);
            setCurrentRideId(null);
            navigate('/passenger');
          }}
          className="bg-card shadow-md rounded-full"
          aria-label="Voltar"
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
                setPierSearch('');
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
                setPierSearch('');
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
          <div className="mt-2 bg-card rounded-xl shadow-lg animate-scale-in">
            <div className="p-2 pb-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  value={pierSearch}
                  onChange={(e) => setPierSearch(e.target.value)}
                  placeholder="Buscar local..."
                  className="pl-9 h-9 text-sm"
                  autoComplete="off"
                />
              </div>
            </div>
            <div className="p-2 pt-1 max-h-52 overflow-y-auto">
              {(() => {
                const filtered = locations
                  .filter((loc) => showOriginPicker ? loc.id !== destination?.id : loc.id !== origin?.id)
                  .filter((loc) => loc.name.toLowerCase().includes(pierSearch.toLowerCase()));

                // When picking origin and no search active, sort nearest pier first
                const sorted = showOriginPicker && !pierSearch && nearestPierId
                  ? [...filtered].sort((a, b) => (a.id === nearestPierId ? -1 : b.id === nearestPierId ? 1 : 0))
                  : filtered;

                if (sorted.length === 0) {
                  return <p className="text-sm text-muted-foreground text-center py-4">Nenhum local encontrado</p>;
                }

                return sorted.map((location) => {
                  const isNearest = showOriginPicker && !pierSearch && location.id === nearestPierId;
                  return (
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
                        setPierSearch('');
                      }}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg active:bg-muted/10 transition-colors ${isNearest ? 'bg-primary/5 border border-primary/20' : 'hover:bg-muted/5'}`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isNearest ? 'bg-primary/15' : 'bg-muted/10'}`}>
                        <MapPin className={`w-5 h-5 ${isNearest ? 'text-primary' : 'text-muted'}`} />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground text-sm">{location.name}</p>
                          {isNearest && (
                            <span className="text-[10px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                              Mais próximo
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted">{location.address}</p>
                      </div>
                      <span className="text-xs text-muted">{location.estimatedTime}</span>
                    </button>
                  );
                });
              })()}
            </div>
          </div>
        )}
      </div>

      {/* Bottom section - Trip confirmation */}
      {canConfirm && !showOriginPicker && !showDestinationPicker && (
        <div className="absolute bottom-0 left-0 right-0 z-30 bg-card rounded-t-3xl animate-slide-up max-h-[90vh] overflow-y-auto" style={{ boxShadow: '0 -4px 32px rgba(0,0,0,0.15)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1 sticky top-0 bg-card rounded-t-3xl">
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
                    className="w-11 h-11 rounded-full border border-border bg-card flex items-center justify-center font-bold text-foreground active:scale-90 transition-transform disabled:opacity-30 cursor-pointer text-sm p-2"
                    disabled={passengerCount <= 1}
                  >
                    −
                  </button>
                  <span className="w-4 text-center font-bold text-sm">{passengerCount}</span>
                  <button
                    onClick={() => setPassengerCount(Math.min(16, passengerCount + 1))}
                    className="w-11 h-11 rounded-full border border-border bg-card flex items-center justify-center font-bold text-foreground active:scale-90 transition-transform disabled:opacity-30 cursor-pointer text-sm p-2"
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
                {hasDiscount && activeDiscount && referralDiscountAmount > 0 && (
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
                {(totalPrice < baseTotal) && (
                  <p className="text-xs text-muted-foreground line-through">R${baseTotal.toFixed(0)}</p>
                )}
                {isPromoRoute && (
                  <p className="text-xs text-muted-foreground line-through">R${(PROMO_ORIGINAL_PRICE * passengerCount).toFixed(0)}</p>
                )}
                <p className={`text-xl font-bold ${isPromoRoute ? 'text-warning' : (totalPrice < baseTotal) ? 'text-success' : 'text-foreground'}`}>
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

                {walletBalance !== null && walletBalance >= totalPrice && (
                  <>
                    <Button
                      variant="default"
                      size="lg"
                      fullWidth
                      onClick={handleConfirmWithWallet}
                      disabled={payingWithWallet || isCreating}
                      className="h-16 text-sm font-bold rounded-2xl gap-3 animate-fade-in"
                    >
                      {payingWithWallet ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Pagando com saldo...
                        </>
                      ) : (
                        <>
                          <Wallet className="w-5 h-5 shrink-0" />
                          <div className="flex flex-col items-start">
                            <span>Pagar R$ {totalPrice.toFixed(2).replace('.', ',')} com saldo</span>
                            <span className="text-[10px] opacity-70 font-normal">
                              Saldo disponível: R$ {walletBalance.toFixed(2).replace('.', ',')}
                            </span>
                          </div>
                        </>
                      )}
                    </Button>
                    <p className="text-[10px] text-muted-foreground text-center uppercase tracking-widest py-1">
                      — ou pague de outra forma —
                    </p>
                  </>
                )}

                {walletBalance !== null && walletBalance > 0 && walletBalance < totalPrice && (
                  <button
                    type="button"
                    onClick={() => navigate('/passenger/wallet')}
                    className="w-full flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1.5"
                  >
                    <Wallet className="w-3 h-3" />
                    Saldo: R$ {walletBalance.toFixed(2).replace('.', ',')} · Adicionar →
                  </button>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={walletBalance !== null && walletBalance >= totalPrice ? 'outline' : 'default'}
                    size="lg"
                    fullWidth
                    onClick={() => handleConfirm('pix')}
                    disabled={isCreating || payingWithWallet}
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
                    disabled={isCreating || payingWithWallet}
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
        onClose={() => setShowPaymentModal(false)}
        onPaymentComplete={handlePaymentComplete}
        rideId={currentRideId || ''}
        amount={activeRidePrice ?? totalPrice}
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
