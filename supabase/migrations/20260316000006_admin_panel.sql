-- Admin Panel Migration
-- Creates: admin_users, pilot_documents tables
-- Updates: pilot_profiles with approval workflow fields
-- Creates: pilot-documents storage bucket

-- ============================================================
-- 1. Admin users table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.admin_users (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email       text NOT NULL,
  full_name   text NOT NULL,
  role        text NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT admin_users_user_id_unique UNIQUE (user_id)
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Only admins can read admin_users (via service role in edge functions)
-- No public access
CREATE POLICY "admin_users_no_public_access"
  ON public.admin_users
  FOR ALL
  USING (false);

-- ============================================================
-- 2. Add approval fields to pilot_profiles
-- ============================================================
ALTER TABLE public.pilot_profiles
  ADD COLUMN IF NOT EXISTS approval_status   text NOT NULL DEFAULT 'pending'
    CHECK (approval_status IN ('pending', 'under_review', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS approval_notes    text,
  ADD COLUMN IF NOT EXISTS reviewed_by       uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS reviewed_at       timestamptz,
  ADD COLUMN IF NOT EXISTS submitted_at      timestamptz;

-- Pilots that already exist and are verified → mark approved
UPDATE public.pilot_profiles
SET approval_status = 'approved', submitted_at = created_at
WHERE is_verified = true AND approval_status = 'pending';

-- ============================================================
-- 3. Pilot documents table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.pilot_documents (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pilot_id        uuid NOT NULL REFERENCES public.pilot_profiles(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_type   text NOT NULL CHECK (document_type IN (
    'rg_front', 'rg_back', 'cnh', 'carta_nautica',
    'boat_registration', 'proof_of_residence', 'selfie'
  )),
  storage_path    text NOT NULL,   -- path inside pilot-documents bucket
  file_name       text NOT NULL,
  mime_type       text NOT NULL,
  file_size_bytes bigint,
  status          text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason text,
  uploaded_at     timestamptz NOT NULL DEFAULT now(),
  reviewed_at     timestamptz,
  CONSTRAINT pilot_documents_pilot_type_unique UNIQUE (pilot_id, document_type)
);

ALTER TABLE public.pilot_documents ENABLE ROW LEVEL SECURITY;

-- Pilots can insert/read their own documents
CREATE POLICY "pilot_docs_own_select"
  ON public.pilot_documents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "pilot_docs_own_insert"
  ON public.pilot_documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "pilot_docs_own_update"
  ON public.pilot_documents FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 4. Partner ads table (for admin to manage)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.partner_ads (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title        text NOT NULL,
  description  text,
  image_url    text,
  link_url     text,
  is_active    boolean NOT NULL DEFAULT true,
  position     text NOT NULL DEFAULT 'home' CHECK (position IN ('home', 'completed', 'searching')),
  starts_at    timestamptz,
  ends_at      timestamptz,
  created_by   uuid REFERENCES auth.users(id),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.partner_ads ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read active ads
CREATE POLICY "partner_ads_public_read"
  ON public.partner_ads FOR SELECT
  USING (is_active = true AND (starts_at IS NULL OR starts_at <= now()) AND (ends_at IS NULL OR ends_at >= now()));

-- No public write access (admin uses service role)
CREATE POLICY "partner_ads_no_public_write"
  ON public.partner_ads FOR INSERT
  WITH CHECK (false);

-- ============================================================
-- 5. Check function: is user an admin?
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = auth.uid()
    AND is_active = true
  );
$$;

-- ============================================================
-- 6. Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_pilot_profiles_approval_status
  ON public.pilot_profiles(approval_status);

CREATE INDEX IF NOT EXISTS idx_pilot_documents_pilot_id
  ON public.pilot_documents(pilot_id);

CREATE INDEX IF NOT EXISTS idx_pilot_documents_status
  ON public.pilot_documents(status);

CREATE INDEX IF NOT EXISTS idx_partner_ads_active
  ON public.partner_ads(is_active, starts_at, ends_at);
