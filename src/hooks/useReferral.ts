import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ReferralDiscount {
  id: string;
  discount_percent: number;
  is_used: boolean;
  created_at: string;
}

export function useReferral(userId: string | undefined) {
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [pendingDiscounts, setPendingDiscounts] = useState<ReferralDiscount[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchReferralData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { data: profile } = await supabase
        .from('passenger_profiles')
        .select('referral_code')
        .eq('user_id', userId)
        .single();

      if (profile?.referral_code) {
        setReferralCode(profile.referral_code);
      } else {
        // Generate a stable code based on userId to avoid race condition across hook instances
        const code = userId.replace(/-/g, '').substring(0, 8).toUpperCase();
        const { data: updated } = await supabase
          .from('passenger_profiles')
          .update({ referral_code: code })
          .eq('user_id', userId)
          .select('referral_code')
          .single();
        setReferralCode(updated?.referral_code ?? code);
      }

      const { data: discounts } = await supabase
        .from('referral_discounts')
        .select('id, discount_percent, is_used, created_at')
        .eq('passenger_user_id', userId)
        .eq('is_used', false)
        .order('created_at', { ascending: false });

      setPendingDiscounts(discounts ?? []);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchReferralData();
  }, [fetchReferralData]);

  /**
   * Call when a new user signs up with a referral code.
   * Awards a 30% coupon to the referrer.
   */
  const redeemReferralCode = async (code: string, newUserId: string) => {
    const { data: referrer } = await supabase
      .from('passenger_profiles')
      .select('user_id')
      .eq('referral_code', code.toUpperCase())
      .single();

    if (!referrer) return false;

    // Mark new user as referred
    await supabase
      .from('passenger_profiles')
      .update({ referred_by: code.toUpperCase() })
      .eq('user_id', newUserId);

    // Award coupon to referrer
    await supabase.from('referral_discounts').insert({
      passenger_user_id: referrer.user_id,
      discount_percent: 30,
      earned_from_user_id: newUserId,
    });

    return true;
  };

  /**
   * Marks a discount as used on a ride.
   */
  const useDiscount = async (discountId: string, rideId: string) => {
    await supabase
      .from('referral_discounts')
      .update({ is_used: true, used_on_ride_id: rideId, used_at: new Date().toISOString() })
      .eq('id', discountId);
    setPendingDiscounts((prev) => prev.filter((d) => d.id !== discountId));
  };

  const hasDiscount = pendingDiscounts.length > 0;
  const activeDiscount = pendingDiscounts[0] ?? null;

  return {
    referralCode,
    pendingDiscounts,
    hasDiscount,
    activeDiscount,
    loading,
    redeemReferralCode,
    useDiscount,
    refetch: fetchReferralData,
  };
}
