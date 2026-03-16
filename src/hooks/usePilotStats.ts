import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';

interface PilotStats {
  ridesToday: number;
  earnings: number;
  tips: number;
  rating: number;
  totalRides: number;
}

export const usePilotStats = () => {
  const { pilotProfile } = useAuthContext();
  const [stats, setStats] = useState<PilotStats>({
    ridesToday: 0,
    earnings: 0,
    tips: 0,
    rating: 0,
    totalRides: 0,
  });
  const [loading, setLoading] = useState(true);

  // pilotId = pilot_profiles.id — this UUID is stored as pilot_id in rides
  const pilotId = pilotProfile?.id ?? null;

  const fetchStats = useCallback(async (currentPilotId: string) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [allResult, todayResult] = await Promise.all([
        supabase
          .from('rides')
          .select('id, price, tip, completed_at')
          .eq('pilot_id', currentPilotId)
          .eq('status', 'completed')
          .eq('payment_status', 'paid'),
        supabase
          .from('rides')
          .select('id, price, tip')
          .eq('pilot_id', currentPilotId)
          .eq('status', 'completed')
          .eq('payment_status', 'paid')
          .gte('completed_at', today.toISOString()),
      ]);

      const allRides = allResult.data ?? [];
      const todayRides = todayResult.data ?? [];

      const ridesToday = todayRides.length;
      const totalRides = allRides.length;
      const todayEarnings = todayRides.reduce((sum, r) => sum + Number(r.price || 0), 0);
      const todayTips = todayRides.reduce((sum, r) => sum + Number(r.tip || 0), 0);

      // Use rating stored on pilot_profiles (maintained by review trigger)
      const avgRating =
        typeof pilotProfile?.rating === 'number' && pilotProfile.rating > 0
          ? pilotProfile.rating
          : 5.0;

      setStats({
        ridesToday,
        earnings: todayEarnings + todayTips,
        tips: todayTips,
        rating: Math.round(avgRating * 10) / 10,
        totalRides,
      });
    } catch (error) {
      console.error('Error in fetchStats:', error);
    } finally {
      setLoading(false);
    }
  }, [pilotProfile?.rating]);

  useEffect(() => {
    if (!pilotId) {
      setLoading(false);
      return;
    }
    fetchStats(pilotId);
  }, [pilotId, fetchStats]);

  useEffect(() => {
    if (!pilotId) return;

    const channel = supabase
      .channel(`pilot-stats-${pilotId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rides',
          filter: `pilot_id=eq.${pilotId}`,
        },
        () => {
          fetchStats(pilotId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pilotId, fetchStats]);

  return { stats, loading, pilotId, refetch: () => pilotId && fetchStats(pilotId) };
};
