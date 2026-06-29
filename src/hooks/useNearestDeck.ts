import { useEffect, useState } from 'react';
import { locations } from '@/data/mockData';

export interface NearestDeckResult {
  deck: typeof locations[0] | null;
  distanceMeters: number | null;
  status: 'idle' | 'requesting' | 'ready' | 'denied' | 'unsupported' | 'error';
  userCoords: { lat: number; lng: number } | null;
}

export const haversineMeters = (
  lat1: number, lng1: number, lat2: number, lng2: number,
): number => {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
};

export const useNearestDeck = (enabled = true): NearestDeckResult => {
  const [state, setState] = useState<NearestDeckResult>({
    deck: null,
    distanceMeters: null,
    status: 'idle',
    userCoords: null,
  });

  useEffect(() => {
    if (!enabled) return;
    if (!('geolocation' in navigator)) {
      setState((s) => ({ ...s, status: 'unsupported' }));
      return;
    }
    setState((s) => ({ ...s, status: 'requesting' }));
    const watcher = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        let best: { deck: typeof locations[0]; distance: number } | null = null;
        for (const loc of locations) {
          const [locLng, locLat] = loc.coordinates;
          const d = haversineMeters(lat, lng, locLat, locLng);
          if (!best || d < best.distance) best = { deck: loc, distance: d };
        }
        setState({
          deck: best?.deck ?? null,
          distanceMeters: best?.distance ?? null,
          status: 'ready',
          userCoords: { lat, lng },
        });
      },
      (err) => {
        setState((s) => ({
          ...s,
          status: err.code === err.PERMISSION_DENIED ? 'denied' : 'error',
        }));
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 30_000 },
    );
    return () => navigator.geolocation.clearWatch(watcher);
  }, [enabled]);

  return state;
};
