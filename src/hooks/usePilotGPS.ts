import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { isNativeMobile } from '@/capacitor';

interface UsePilotGPSOptions {
  rideId: string | undefined;
  pilotId?: string;
  isActive: boolean;
  intervalMs?: number; // kept for API compatibility, no longer used
}

const haversineMeters = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
};

export const usePilotGPS = ({ rideId, pilotId, isActive }: UsePilotGPSOptions) => {
  const watchIdRef = useRef<number | null>(null);
  const lastPersistedRef = useRef<{ lat: number; lng: number } | null>(null);

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

  useEffect(() => {
    if (!isActive || (!rideId && !pilotId)) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    if (!navigator.geolocation) {
      console.error('Geolocation not supported');
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        // On web, skip updates when the tab is hidden to save battery.
        // On native mobile (Capacitor) the app keeps a foreground service for GPS
        // so we must continue updating even while backgrounded — skipping would
        // break real-time passenger tracking.
        if (!isNativeMobile && document.hidden) return;

        const { latitude, longitude } = position.coords;

        // Only persist to DB when pilot moved more than 10 meters
        const last = lastPersistedRef.current;
        if (last !== null && haversineMeters(last.lat, last.lng, latitude, longitude) < 10) {
          return;
        }

        lastPersistedRef.current = { lat: latitude, lng: longitude };
        updatePilotPosition(latitude, longitude);
      },
      (error) => {
        console.error('Error getting position:', error);
        if (error.code === GeolocationPositionError.PERMISSION_DENIED) {
          toast.error('Permissão de localização negada. Ative o GPS nas configurações do dispositivo.', { id: 'gps-denied', duration: 8000 });
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      // Mark pilot as unavailable when going offline
      // void is intentional: fire-and-forget in cleanup (cannot await in useEffect cleanup)
      if (pilotId) {
        void supabase
          .from('locations')
          .update({ is_available: false, heading: null, speed: null })
          .eq('pilot_id', pilotId);
      }
    };
  }, [isActive, rideId, pilotId, updatePilotPosition]);

  return { updatePilotPosition };
};
