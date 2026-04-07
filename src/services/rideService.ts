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
  const { error } = await supabase
    .from('rides')
    .update({ status: 'cancelled' })
    .eq('id', rideId)
    .eq('status', 'pending')
    .neq('payment_status', 'paid')
    .or(`passenger_user_id.eq.${userId},passenger_device_id.eq.${userId}`);

  if (error) {
    throw error;
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
