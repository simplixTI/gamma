import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNotifications } from './useNotifications';
import { useNotificationSound } from './useNotificationSound';
import { DbRide } from '@/types';

interface UseRideSubscriptionOptions {
  rideId?: string;
  deviceId?: string;
  isPilot?: boolean;
  onRideUpdate?: (ride: DbRide) => void;
}

export const useRideSubscription = ({
  rideId,
  deviceId,
  isPilot = false,
  onRideUpdate,
}: UseRideSubscriptionOptions) => {
  const {
    notifyRideAccepted,
    notifyPilotArrived,
    notifyRideStarted,
    notifyRideCompleted,
    notifyNewRideRequest,
  } = useNotifications();
  const { playNewRideSound, playSound } = useNotificationSound();

  const previousStatusRef = useRef<string | null>(null);

  const handleRideChange = useCallback(
    (payload: { new: DbRide; old: DbRide | null }) => {
      const newRide = payload.new;
      const oldRide = payload.old;
      const previousStatus = oldRide?.status || previousStatusRef.current;

      console.log('Ride update received:', { newRide, previousStatus });

      // Call the callback
      onRideUpdate?.(newRide);

      // Handle passenger notifications
      if (!isPilot) {
        // Pilot accepted the ride
        if (previousStatus === 'pending' && newRide.status === 'accepted') {
          playSound();
          notifyRideAccepted(newRide.pilot_name || 'Piloto');
        }

        // Pilot arrived at pickup
        if (previousStatus === 'accepted' && newRide.status === 'pilot_arriving') {
          playSound();
          notifyPilotArrived(
            newRide.pilot_name || 'Piloto',
            newRide.origin_name
          );
        }

        // Ride started
        if (previousStatus === 'pilot_arriving' && newRide.status === 'in_progress') {
          notifyRideStarted();
        }

        // Ride completed
        if (previousStatus === 'in_progress' && newRide.status === 'completed') {
          notifyRideCompleted(Number(newRide.price));
        }
      }

      // Store current status for next comparison
      previousStatusRef.current = newRide.status;
    },
    [isPilot, notifyRideAccepted, notifyPilotArrived, notifyRideStarted, notifyRideCompleted, onRideUpdate, playSound]
  );

  // Subscribe to new ride requests (for pilots)
  const handleNewRideRequest = useCallback(
    (payload: { new: DbRide }) => {
      const ride = payload.new;
      console.log('New ride request:', ride);
      
      if (isPilot && ride.status === 'pending') {
        playNewRideSound();
        notifyNewRideRequest(
          ride.passenger_name || 'Passageiro',
          ride.origin_name,
          Number(ride.price)
        );
      }
    },
    [isPilot, notifyNewRideRequest, playNewRideSound]
  );

  useEffect(() => {
    if (!rideId && !deviceId && !isPilot) {
      return;
    }

    const channelName = rideId 
      ? `ride-${rideId}` 
      : isPilot 
        ? 'pilot-rides' 
        : `passenger-${deviceId}`;

    console.log('Setting up ride subscription:', channelName);

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rides',
          filter: rideId 
            ? `id=eq.${rideId}` 
            : isPilot 
              ? `status=eq.pending` 
              : `passenger_device_id=eq.${deviceId}`,
        },
        (payload) => {
          console.log('Realtime payload:', payload);
          
          if (payload.eventType === 'INSERT' && isPilot) {
            handleNewRideRequest({ new: payload.new as DbRide });
          } else if (payload.eventType === 'UPDATE') {
            handleRideChange({ 
              new: payload.new as DbRide, 
              old: (payload.old as DbRide) || null 
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status);
      });

    return () => {
      console.log('Unsubscribing from ride channel');
      supabase.removeChannel(channel);
    };
  }, [rideId, deviceId, isPilot, handleRideChange, handleNewRideRequest]);
};

// Generate a stable device ID persisted in localStorage.
// Uses crypto.randomUUID for collision-free uniqueness.
export const getDeviceId = (): string => {
  const KEY = 'gamma_device_id';
  try {
    const stored = localStorage.getItem(KEY);
    if (stored) return stored;
    const id = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `passenger_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(KEY, id);
    return id;
  } catch {
    // Fallback if localStorage is unavailable (private mode edge case)
    return `passenger_fallback_${Date.now().toString(36)}`;
  }
};
