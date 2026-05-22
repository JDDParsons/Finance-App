-- =============================================================
-- Seed: test@budgify.ca test account with sample household data
-- Safe to re-run (ON CONFLICT DO NOTHING throughout)
-- Magic link login — catch emails at http://localhost:54324
-- =============================================================

-- Fixed UUIDs for deterministic, referenceable seed data
-- user_id:              a1b2c3d4-1234-5678-abcd-000000000001
-- household_id:         a1b2c3d4-1234-5678-abcd-000000000002
-- account_chequing_id:  a1b2c3d4-1234-5678-abcd-000000000003
-- account_visa_id:      a1b2c3d4-1234-5678-abcd-000000000004

-- ---------------------------------------------------------------
-- 1. Auth user (no password — magic link / OTP flow)
-- ---------------------------------------------------------------
-- GoTrue requires several text columns to be '' not NULL (or it errors on scan)
INSERT INTO auth.users (
  instance_id, id, aud, role, email,
  encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data,
  is_super_admin, created_at, updated_at,
  confirmation_token, recovery_token,
  email_change, email_change_token_new, email_change_token_current,
  phone_change, phone_change_token, reauthentication_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'a1b2c3d4-1234-5678-abcd-000000000001',
  'authenticated', 'authenticated',
  'test@budgify.ca',
  '', now(),
  '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
  false, now(), now(),
  '', '', '', '', '', '', '', ''
) ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (
  id,
  user_id,
  provider_id,
  identity_data,
  provider,
  last_sign_in_at, created_at, updated_at
) VALUES (
  'a1b2c3d4-1234-5678-abcd-000000000001',
  'a1b2c3d4-1234-5678-abcd-000000000001',
  'test@budgify.ca',
  '{"sub":"a1b2c3d4-1234-5678-abcd-000000000001","email":"test@budgify.ca","email_verified":true,"phone_verified":false}'::jsonb,
  'email',
  now(), now(), now()
) ON CONFLICT (provider, provider_id) DO NOTHING;


-- ---------------------------------------------------------------
-- 2. Household
-- ---------------------------------------------------------------
INSERT INTO public."Household" (id, created_at)
VALUES ('a1b2c3d4-1234-5678-abcd-000000000002', now())
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------
-- 3. Household member
-- ---------------------------------------------------------------
INSERT INTO public."Household_Member" (household_id, user_id, created_at)
VALUES (
  'a1b2c3d4-1234-5678-abcd-000000000002',
  'a1b2c3d4-1234-5678-abcd-000000000001',
  now()
) ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------
-- 4. Profile
-- ---------------------------------------------------------------
INSERT INTO public."Profile" (id, user_id, household_id, first_name, last_name, email, created_at)
VALUES (
  gen_random_uuid(),
  'a1b2c3d4-1234-5678-abcd-000000000001',
  'a1b2c3d4-1234-5678-abcd-000000000002',
  'Test',
  'User',
  'test@budgify.ca',
  now()
) ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------
-- 5. Accounts
-- ---------------------------------------------------------------
INSERT INTO "finance-app"."Account" (id, name, institution, household_id, user_id, is_default_for_income, is_default_for_expenses, is_credit_card, created_at)
VALUES
  (
    'a1b2c3d4-1234-5678-abcd-000000000003',
    'Chequing',
    'TD Bank',
    'a1b2c3d4-1234-5678-abcd-000000000002',
    'a1b2c3d4-1234-5678-abcd-000000000001',
    true,
    false,
    false,
    now()
  ),
  (
    'a1b2c3d4-1234-5678-abcd-000000000004',
    'Visa',
    'TD Bank',
    'a1b2c3d4-1234-5678-abcd-000000000002',
    'a1b2c3d4-1234-5678-abcd-000000000001',
    false,
    true,
    true,
    now()
  )
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------
-- 6. Budgets
-- ---------------------------------------------------------------
INSERT INTO "finance-app"."Budgets" (id, name, amount, household_id, user_id, color, icon, inactive, created_at)
VALUES
  (gen_random_uuid(), 'Groceries',     600,  'a1b2c3d4-1234-5678-abcd-000000000002', 'a1b2c3d4-1234-5678-abcd-000000000001', '#4CAF50', '🛒', false, now()),
  (gen_random_uuid(), 'Dining Out',    300,  'a1b2c3d4-1234-5678-abcd-000000000002', 'a1b2c3d4-1234-5678-abcd-000000000001', '#FF9800', '🍽️', false, now()),
  (gen_random_uuid(), 'Gas',           200,  'a1b2c3d4-1234-5678-abcd-000000000002', 'a1b2c3d4-1234-5678-abcd-000000000001', '#2196F3', '⛽', false, now()),
  (gen_random_uuid(), 'Utilities',     150,  'a1b2c3d4-1234-5678-abcd-000000000002', 'a1b2c3d4-1234-5678-abcd-000000000001', '#9C27B0', '💡', false, now()),
  (gen_random_uuid(), 'Entertainment', 100,  'a1b2c3d4-1234-5678-abcd-000000000002', 'a1b2c3d4-1234-5678-abcd-000000000001', '#E91E63', '🎬', false, now())
ON CONFLICT (id) DO NOTHING;
