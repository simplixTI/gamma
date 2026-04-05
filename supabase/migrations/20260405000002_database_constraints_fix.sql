-- Migration: Database Constraints Fix
-- Description: Add missing constraints, indexes, and validations to improve data integrity
-- Date: 2026-04-05
-- Purpose: Fix database constraint gaps in Gamma App

-- 1. Add payment_status CHECK constraint on rides table
-- Ensures payment_status values are valid and consistent
DO $$ BEGIN
  ALTER TABLE public.rides ADD CONSTRAINT rides_payment_status_check
    CHECK (payment_status IN ('pending', 'processing', 'paid', 'failed', 'refunded'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON CONSTRAINT rides_payment_status_check ON public.rides IS 'Validates payment_status values in rides table';

-- 2. Add UNIQUE constraint on referral_discounts
-- Prevents the same referral code from being applied multiple times by the same user
CREATE UNIQUE INDEX IF NOT EXISTS idx_referral_discounts_unique_use
  ON public.referral_discounts (passenger_user_id, earned_from_user_id)
  WHERE is_used = TRUE;

-- 3. Add missing index on wallet_transactions
-- Optimizes queries filtering by user_id and sorting by creation date (most common access pattern)
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_created
  ON public.wallet_transactions (user_id, created_at DESC);

-- 4. Add index on payments.mp_payment_id for webhook lookups
-- Improves performance for MercadoPago webhook lookups and reconciliation
CREATE INDEX IF NOT EXISTS idx_payments_mp_payment_id
  ON public.payments (mp_payment_id) WHERE mp_payment_id IS NOT NULL;

-- 5. Add approval_status CHECK constraint on pilot_profiles
-- Ensures pilot approval status values are valid and consistent
DO $$ BEGIN
  ALTER TABLE public.pilot_profiles ADD CONSTRAINT pilot_approval_status_check
    CHECK (approval_status IN ('pending', 'approved', 'rejected', 'suspended'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON CONSTRAINT pilot_approval_status_check ON public.pilot_profiles IS 'Validates approval_status values in pilot_profiles table';
