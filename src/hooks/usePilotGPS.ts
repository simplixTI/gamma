import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UsePilotGPSOptions {
  rideId: string | undefined;
  pilotId?: string;
  isActive: boolean;
  intervalMs?: number;
}

export const usePilotGPS = ({ rideId, pilotId, isActive, intervalMs = 5000 }: UsePilotGPSOptions) => {
  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const updatePilotPosition = useCallback(async (lat: number, lng: number) => {
    const updates: Promise<unknown>[] = [];

    if (rideId) {
      updates.push(
        supabase
          .from('rides')
          .update({ pilot_lat: lat, pilot_lng: lng, updated_at: new Date().toISOString() })
          .eq('id', rideId)
          .then(({ error }) => {
            if (error) console.error('Error updating ride position:', error);
          })
      );
    }

    if (pilotId) {
      updates.push(
        supabase
          .from('locations')
          .upsert(
            { pilot_id: pilotId, lat, lng, is_available: !rideId, updated_at: new Date().toISOString() },
            { onConflict: 'pilot_id' }
          )
          .then(({ error }) => {
            if (error) console.error('Error updating pilot location:', error);
          })
      );
    }

    await Promise.all(updates);
  }, [rideId, pilotId]);

  const getCurrentPosition = useCallback(() => {
    if (!navigator.geolocation) {
      console.error('Geolocation not supported');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        updatePilotPosition(latitude, longitude);
      },
      (error) => {
        console.error('Error getting position:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, [updatePilotPosition]);

  useEffect(() => {
    if (!isActive || (!rideId && !pilotId)) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Get initial position
    getCurrentPosition();

    // Set up interval for position updates
    intervalRef.current = setInterval(() => {
      getCurrentPosition();
    }, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      // Mark pilot as unavailable when going offline
      if (pilotId) {
        supabase
          .from('locations')
          .update({ is_available: false })
          .eq('pilot_id', pilotId);
      }
    };
  }, [isActive, rideId, pilotId, intervalMs, getCurrentPosition]);

  return { updatePilotPosition, getCurrentPosition };
};
