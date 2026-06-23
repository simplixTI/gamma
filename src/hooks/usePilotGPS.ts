import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { isNativeMobile } from '@/capacitor';
import { Geolocation } from '@capacitor/geolocation';

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
  const activeRideRef = useRef<string | undefined>(undefined);

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
    // Track current ride status for cleanup
    activeRideRef.current = rideId;

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

    let cancelled = false;

    const startWatch = async () => {
      if (isNativeMobile) {
        try {
          const perm = await Geolocation.requestPermissions();
          if (cancelled) return;
          if (perm.location !== 'granted') {
            console.warn('[PilotGPS] Location permission denied');
            return;
          }
        } catch (e) {
          console.warn('[PilotGPS] Could not request location permission:', e);
        }
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
          if (error.code === 1 /* PERMISSION_DENIED */) {
            toast.error('Permissão de localização negada. Ative o GPS nas configurações do dispositivo.', { id: 'gps-denied', duration: 8000 });
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    };

    void startWatch();

    return () => {
      cancelled = true;
      lastPersistedRef.current = null; // reset between sessions
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      // Mark pilot as unavailable when going offline, but ONLY if no active ride in progress.
      // During active rides, keep is_available=true even if GPS hook unmounts temporarily.
      // fetch with keepalive=true fires even during page unload / app backgrounding.
      if (pilotId && !activeRideRef.current) {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
        const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
        // Best-effort: use Supabase SDK (works during normal unmount).
        // PostgrestBuilder is thenable but not a Promise, so .catch() throws
        // TypeError — use the 2-arg form of .then() to swallow errors.
        void supabase
          .from('locations')
          .update({ is_available: false, heading: null, speed: null })
          .eq('pilot_id', pilotId)
          .then(() => {}, () => {});
        // Keepalive fetch as fallback for page unload / app kill scenarios
        // Use the cached user session token (not the anon key) so RLS allows the update
        supabase.auth.getSession().then(({ data: { session } }) => {
          const token = session?.access_token ?? anonKey;
          void fetch(`${supabaseUrl}/rest/v1/locations?pilot_id=eq.${encodeURIComponent(pilotId)}`, {
            method: 'PATCH',
            keepalive: true,
            headers: {
              'Content-Type': 'application/json',
              'apikey': anonKey,
              'Authorization': `Bearer ${token}`,
              'Prefer': 'return=minimal',
            },
            body: JSON.stringify({ is_available: false, heading: null, speed: null }),
          }).catch(() => {});
        }).catch(() => {});
      }
    };
  }, [isActive, rideId, pilotId, updatePilotPosition]);

  return { updatePilotPosition };
};
