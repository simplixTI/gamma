-- ============================================================
-- SCRIPT: Criar usuário administrador no Supabase
-- ============================================================
--
-- PASSO 1 — Criar a conta no Supabase Auth
-- -------------------------------------------------------
--   1. Acesse: https://supabase.com/dashboard → seu projeto
--   2. Vá em Authentication → Users
--   3. Clique em "Add user" → "Create new user"
--   4. Preencha o e-mail e a senha do admin
--   5. Copie o UUID exibido na coluna "User UID"
--      Exemplo: a1b2c3d4-e5f6-7890-abcd-ef1234567890
--
-- PASSO 2 — Rodar este script no SQL Editor
-- -------------------------------------------------------
--   1. Vá em SQL Editor no Supabase Dashboard
--   2. Substitua SOMENTE os três valores marcados abaixo:
--      • <COLE-O-UUID-AQUI>   → o UUID copiado no Passo 1
--      • <email@dominio.com>  → o mesmo e-mail usado no Passo 1
--      • <Nome do Admin>      → nome completo para exibição
--   3. Execute o script
-- ============================================================

INSERT INTO public.admin_users (user_id, email, full_name, role, is_active)
VALUES (
  '<COLE-O-UUID-AQUI>',       -- ← substitua pelo UUID do auth.users (ex: a1b2c3d4-...)
  '<email@dominio.com>',       -- ← substitua pelo e-mail do admin
  '<Nome do Admin>',           -- ← substitua pelo nome completo
  'super_admin',               -- 'super_admin' ou 'admin'
  true
)
ON CONFLICT (user_id) DO UPDATE SET
  email      = EXCLUDED.email,
  full_name  = EXCLUDED.full_name,
  role       = EXCLUDED.role,
  is_active  = true,
  updated_at = now();

-- ============================================================
-- VERIFICAÇÃO — Rode as queries abaixo para confirmar tudo OK
-- ============================================================

-- 1. Confirmar que o usuário admin foi inserido:
SELECT id, user_id, email, full_name, role, is_active, created_at
FROM public.admin_users;

-- 2. Confirmar que a política RLS de self-read existe
--    (necessária para o login do admin funcionar no browser):
SELECT policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename  = 'admin_users';
-- Você deve ver "admin_users_self_read" com USING (auth.uid() = user_id)
-- Se só aparecer "admin_users_no_public_access" com USING (false),
-- execute a migration 20260316000007_admin_rls_policies.sql manualmente.

-- 3. Confirmar que o usuário existe também em auth.users:
SELECT id, email, created_at
FROM auth.users
WHERE id = '<COLE-O-UUID-AQUI>';  -- ← mesmo UUID de cima
