import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ReferralDiscount {
  id: string;
  discount_percent: number;
  is_used: boolean;
  created_at: string;
  expires_at: string | null;
}

export function useReferral(userId: string | undefined) {
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [pendingDiscounts, setPendingDiscounts] = useState<ReferralDiscount[]>([]);
  const [loading, setLoading] = useState(false);
  const usingDiscountRef = useRef<Set<string>>(new Set()); // Track discounts being used to prevent double-apply

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

      const now = new Date().toISOString();
      const { data: discounts } = await supabase
        .from('referral_discounts')
        .select('id, discount_percent, is_used, created_at, expires_at')
        .eq('passenger_user_id', userId)
        .eq('is_used', false)
        .or(`expires_at.is.null,expires_at.gt.${now}`)
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
   * Only marks the new user as referred — discount is granted after their first completed ride.
   */
  const redeemReferralCode = async (code: string, newUserId: string) => {
    const { data: referrer } = await supabase
      .from('passenger_profiles')
      .select('user_id')
      .eq('referral_code', code.toUpperCase())
      .single();

    if (!referrer) return false;

    // Just mark new user as referred — no discount yet
    await supabase
      .from('passenger_profiles')
      .update({ referred_by: code.toUpperCase() })
      .eq('user_id', newUserId);

    return true;
  };

  /**
   * Call after a referred user completes their first ride.
   * Grants a 30% discount (valid 30 days) to the referrer, capped at 3 pending.
   * Safe to call multiple times — only grants once per indicado.
   */
  const grantReferralDiscount = async (indicadoUserId: string) => {
    // Check if this user was referred
    const { data: profile } = await supabase
      .from('passenger_profiles')
      .select('referred_by')
      .eq('user_id', indicadoUserId)
      .maybeSingle();

    if (!profile?.referred_by) return false;

    // Check if a discount was already granted for this indicado (prevent double grant)
    const { data: existing } = await supabase
      .from('referral_discounts')
      .select('id')
      .eq('earned_from_user_id', indicadoUserId)
      .maybeSingle();

    if (existing) return false; // Already granted

    // Find the referrer by code
    const { data: referrer } = await supabase
      .from('passenger_profiles')
      .select('user_id')
      .eq('referral_code', profile.referred_by)
      .maybeSingle();

    if (!referrer) return false;

    // Insert discount — DB trigger enforces the 3-pending cap
    try {
      await supabase.from('referral_discounts').insert({
        passenger_user_id: referrer.user_id,
        discount_percent: 30,
        earned_from_user_id: indicadoUserId,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });
      return true;
    } catch {
      // Cap reached or other DB error — silent fail (no user impact)
      return false;
    }
  };

  /**
   * Marks a discount as used on a ride. Throws on DB error so caller can handle.
   * Uses optimistic locking to prevent concurrent application of the same discount.
   */
  const useDiscount = async (discountId: string, rideId: string) => {
    // Prevent double-use: if this discount is already being processed, exit early
    if (usingDiscountRef.current.has(discountId)) {
      throw new Error('Desconto já está sendo aplicado');
    }

    usingDiscountRef.current.add(discountId);
    try {
      const { error } = await supabase
        .from('referral_discounts')
        .update({ is_used: true, used_on_ride_id: rideId, used_at: new Date().toISOString() })
        .eq('id', discountId)
        .eq('is_used', false); // Atomic check: only update if not already used

      if (error) {
        console.error('[useReferral] Failed to consume discount:', error);
        throw new Error('Erro ao aplicar desconto');
      }
      setPendingDiscounts((prev) => prev.filter((d) => d.id !== discountId));
    } finally {
      usingDiscountRef.current.delete(discountId);
    }
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
    grantReferralDiscount,
    useDiscount,
    refetch: fetchReferralData,
  };
}
