import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ActiveVoucher {
  id: string;
  code: string;
  value: number;
  sponsor: 'owner' | 'platform';
  partner_name: string | null;
}

interface RedeemResult {
  success: boolean;
  error?: string;
  voucher?: ActiveVoucher;
}

export function useVoucher(userId: string | undefined) {
  const [pendingVoucher, setPendingVoucher] = useState<ActiveVoucher | null>(null);
  const [loading, setLoading] = useState(false);

  // Find any voucher the user already redeemed but hasn't applied to a ride yet.
  const fetchPendingVoucher = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('vouchers')
        .select('id, code, value, sponsor, partner_name')
        .eq('used_by', userId)
        .is('used_on_ride_id', null)
        .order('used_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      setPendingVoucher((data as ActiveVoucher) ?? null);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchPendingVoucher();
  }, [fetchPendingVoucher]);

  const redeem = async (code: string): Promise<RedeemResult> => {
    if (!userId) return { success: false, error: 'no_user' };
    const { data, error } = await supabase.rpc('redeem_voucher', {
      p_code: code,
      p_user_id: userId,
    });
    if (error) return { success: false, error: 'rpc_error' };
    if (!data?.success) return { success: false, error: data?.error ?? 'unknown' };

    const voucher: ActiveVoucher = {
      id: data.voucher_id,
      code: data.code,
      value: Number(data.value),
      sponsor: data.sponsor,
      partner_name: data.partner_name ?? null,
    };
    setPendingVoucher(voucher);
    return { success: true, voucher };
  };

  // Called after voucher is applied to a ride — clears local state.
  // The DB row is updated by RequestRide to set used_on_ride_id.
  const clearPendingVoucher = () => setPendingVoucher(null);

  return {
    pendingVoucher,
    loading,
    redeem,
    refetch: fetchPendingVoucher,
    clearPendingVoucher,
  };
}
