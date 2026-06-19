import { supabase } from '@/integrations/supabase/client';
import { Location } from '@/types';

interface CreateRideParams {
  origin: Location;
  destination: Location;
  price: number;
  passengerCount: number;
  estimatedTime: number;
  userId: string;
}

export const createRide = async ({
  origin,
  destination,
  price,
  passengerCount,
  estimatedTime,
  userId,
}: CreateRideParams) => {
  const { data, error } = await supabase
    .from('rides')
    .insert({
      passenger_device_id: userId,
      passenger_user_id: userId,
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
      price: price * passengerCount,
      passenger_count: passengerCount,
      estimated_time: estimatedTime,
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
};

export const cancelRide = async (rideId: string, userId: string) => {
  // Check if ride was already paid — needs refund flag after cancel
  const { data: rideBefore } = await supabase
    .from('rides')
    .select('payment_status')
    .eq('id', rideId)
    .maybeSingle();

  const { error } = await supabase
    .from('rides')
    .update({ status: 'cancelled' })
    .eq('id', rideId)
    .eq('status', 'pending')
    .or(`passenger_user_id.eq.${userId},passenger_device_id.eq.${userId}`);

  if (error) {
    throw error;
  }

  // If the ride was paid, trigger automatic refund via MP API
  if (rideBefore?.payment_status === 'paid') {
    // Normalize payment stuck in 'processing' to 'completed' so mp-refund and
    // request_payment_refund RPC can find it. Webhook sometimes leaves it stuck.
    // RLS blocks authenticated UPDATE on payments — RPC runs SECURITY DEFINER.
    await supabase.rpc('normalize_stuck_payment', { p_ride_id: rideId });

    // Refresh JWT before invoking edge function to avoid 401 on expired tokens
    await supabase.auth.refreshSession();

    // Use fetch() directly instead of functions.invoke() — invoke() strips the
    // Authorization header in some contexts causing UNAUTHORIZED_NO_AUTH_HEADER
    const { data: { session } } = await supabase.auth.getSession();
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
    const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
    let refundErr: unknown = null;
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/mp-refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token ?? ''}`,
          'apikey': ANON_KEY,
        },
        body: JSON.stringify({ rideId }),
      });
      if (!res.ok) {
        refundErr = await res.json().catch(() => ({ status: res.status }));
      }
    } catch (e) {
      refundErr = e;
    }
    if (refundErr) {
      // MP refund failed (card pre-auth, transient state, etc) — credit user wallet
      // instead of leaving them waiting. Instant resolution + funds available for next ride.
      const { data: walletResult, error: walletErr } = await supabase
        .rpc('refund_to_wallet', { p_ride_id: rideId });
      if (walletErr || !(walletResult as { success?: boolean })?.success) {
        // Last resort: flag for manual processing
        await supabase.rpc('request_payment_refund', {
          p_ride_id: rideId,
          p_reason: 'auto_refund_failed_fallback',
        });
        console.warn('Auto refund + wallet credit both failed, marked for manual:', refundErr, walletErr);
      } else {
        console.log('Refund credited to wallet. New balance:', (walletResult as { new_balance?: number }).new_balance);
      }
    }
  }
};

// Get current ACTIVE ride for a user - only pending, accepted, pilot_arriving, in_progress
export const getCurrentRide = async (userId: string) => {
  const { data, error } = await supabase
    .from('rides')
    .select('id, status, payment_status, pilot_id, pilot_name, pilot_phone, origin_name, origin_address, origin_lat, origin_lng, origin_pier_id, destination_name, destination_address, destination_lat, destination_lng, destination_pier_id, price, estimated_time, passenger_count, created_at')
    .or(`passenger_user_id.eq.${userId},passenger_device_id.eq.${userId}`)
    .in('status', ['pending', 'accepted', 'pilot_arriving', 'in_progress'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
};
