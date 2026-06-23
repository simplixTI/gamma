import { supabase } from '@/integrations/supabase/client';

interface RedeemResult {
  success: boolean;
  error?: string;
  value?: number;
  code?: string;
  newBalance?: number;
}

export function useVoucher(userId: string | undefined) {
  const redeem = async (code: string): Promise<RedeemResult> => {
    if (!userId) return { success: false, error: 'no_user' };
    const { data, error } = await supabase.rpc('redeem_voucher', {
      p_code: code,
      p_user_id: userId,
    });
    if (error) return { success: false, error: 'rpc_error' };
    if (!data?.success) return { success: false, error: data?.error ?? 'unknown' };

    return {
      success: true,
      value: Number(data.value),
      code: data.code,
      newBalance: data.new_balance != null ? Number(data.new_balance) : undefined,
    };
  };

  return { redeem };
}
