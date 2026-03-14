import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PilotLocation {
  pilot_id: string;
  lat: number;
  lng: number;
  is_available: boolean;
}

export const usePilotLocations = (isActive: boolean) => {
  const [pilotLocations, setPilotLocations] = useState<PilotLocation[]>([]);

  useEffect(() => {
    if (!isActive) {
      setPilotLocations([]);
      return;
    }

    const fetchLocations = async () => {
      const { data } = await supabase
        .from('locations')
        .select('pilot_id, lat, lng, is_available')
        .eq('is_available', true);
      if (data) setPilotLocations(data as PilotLocation[]);
    };

    fetchLocations();

    const channel = supabase
      .channel('pilot-locations-map')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'locations' }, (payload) => {
        if (payload.eventType === 'DELETE') {
          const old = payload.old as PilotLocation;
          setPilotLocations((prev) => prev.filter((p) => p.pilot_id !== old.pilot_id));
          return;
        }
        const loc = payload.new as PilotLocation;
        setPilotLocations((prev) => {
          if (!loc.is_available) return prev.filter((p) => p.pilot_id !== loc.pilot_id);
          const idx = prev.findIndex((p) => p.pilot_id === loc.pilot_id);
          if (idx >= 0) {
            const updated = [...prev];
            updated[idx] = loc;
            return updated;
          }
          return [...prev, loc];
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isActive]);

  return pilotLocations;
};
