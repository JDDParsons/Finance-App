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
-- budget ids:           a1b2c3d4-1234-5678-abcd-000000001001 through 1006

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
SELECT
  'a1b2c3d4-1234-5678-abcd-000000000002',
  'a1b2c3d4-1234-5678-abcd-000000000001',
  now()
WHERE NOT EXISTS (
  SELECT 1
  FROM public."Household_Member"
  WHERE household_id = 'a1b2c3d4-1234-5678-abcd-000000000002'
    AND user_id = 'a1b2c3d4-1234-5678-abcd-000000000001'
);

-- ---------------------------------------------------------------
-- 4. Profile
-- ---------------------------------------------------------------
INSERT INTO public."Profile" (id, user_id, household_id, first_name, last_name, email, created_at)
VALUES (
  'a1b2c3d4-1234-5678-abcd-000000000006',
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
INSERT INTO "finance-app"."Budgets" (id, name, household_id, user_id, color, icon, created_at)
VALUES
  ('a1b2c3d4-1234-5678-abcd-000000001001', 'Groceries',     'a1b2c3d4-1234-5678-abcd-000000000002', 'a1b2c3d4-1234-5678-abcd-000000000001', '#4CAF50', '🛒', now()),
  ('a1b2c3d4-1234-5678-abcd-000000001002', 'Dining Out',    'a1b2c3d4-1234-5678-abcd-000000000002', 'a1b2c3d4-1234-5678-abcd-000000000001', '#FF9800', '🍽️', now()),
  ('a1b2c3d4-1234-5678-abcd-000000001003', 'Gas',           'a1b2c3d4-1234-5678-abcd-000000000002', 'a1b2c3d4-1234-5678-abcd-000000000001', '#2196F3', '⛽', now()),
  ('a1b2c3d4-1234-5678-abcd-000000001004', 'Utilities',     'a1b2c3d4-1234-5678-abcd-000000000002', 'a1b2c3d4-1234-5678-abcd-000000000001', '#9C27B0', '💡', now()),
  ('a1b2c3d4-1234-5678-abcd-000000001005', 'Entertainment', 'a1b2c3d4-1234-5678-abcd-000000000002', 'a1b2c3d4-1234-5678-abcd-000000000001', '#E91E63', '🎬', now()),
  ('a1b2c3d4-1234-5678-abcd-000000001006', 'Rent',          'a1b2c3d4-1234-5678-abcd-000000000002', 'a1b2c3d4-1234-5678-abcd-000000000001', '#607D8B', '🏠', now())
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------
-- 7. Monthly budget periods (January through August 2026)
-- ---------------------------------------------------------------
INSERT INTO "finance-app"."Budget_Period" (
  id, budget_id, date, amount, user_id, household_id, created_at
)
SELECT
  md5('period-' || budget.id::text || '-' || month_start::date::text)::uuid,
  budget.id,
  month_start::date,
  CASE budget.id::text
    WHEN 'a1b2c3d4-1234-5678-abcd-000000001001' THEN 600
    WHEN 'a1b2c3d4-1234-5678-abcd-000000001002' THEN 300
    WHEN 'a1b2c3d4-1234-5678-abcd-000000001003' THEN 200
    WHEN 'a1b2c3d4-1234-5678-abcd-000000001004' THEN 150
    WHEN 'a1b2c3d4-1234-5678-abcd-000000001005' THEN 100
    WHEN 'a1b2c3d4-1234-5678-abcd-000000001006' THEN 1200
  END,
  budget.user_id,
  budget.household_id,
  now()
FROM "finance-app"."Budgets" AS budget
CROSS JOIN generate_series('2026-01-01'::date, '2026-08-01'::date, interval '1 month') AS month_start
WHERE budget.id IN (
  'a1b2c3d4-1234-5678-abcd-000000001001',
  'a1b2c3d4-1234-5678-abcd-000000001002',
  'a1b2c3d4-1234-5678-abcd-000000001003',
  'a1b2c3d4-1234-5678-abcd-000000001004',
  'a1b2c3d4-1234-5678-abcd-000000001005',
  'a1b2c3d4-1234-5678-abcd-000000001006'
)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------
-- 8. Bi-weekly income ($1,500 from January 7 through August 19)
-- ---------------------------------------------------------------
INSERT INTO "finance-app"."Budget_Hit" (
  id, amount, user_id, budget_id, date, entity, notes, type,
  account_id, household_id, created_at
)
SELECT
  md5('income-' || pay_date::date::text)::uuid,
  1500,
  'a1b2c3d4-1234-5678-abcd-000000000001',
  NULL,
  pay_date::date,
  'Payroll',
  'Bi-weekly pay',
  'Income',
  'a1b2c3d4-1234-5678-abcd-000000000003',
  'a1b2c3d4-1234-5678-abcd-000000000002',
  now()
FROM generate_series('2026-01-07'::date, '2026-08-19'::date, interval '14 days') AS pay_date
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------
-- 9. Monthly rent payments
-- ---------------------------------------------------------------
INSERT INTO "finance-app"."Budget_Hit" (
  id, amount, user_id, budget_id, date, entity, notes, type,
  account_id, household_id, created_at
)
SELECT
  md5('rent-' || month_start::date::text)::uuid,
  1200,
  'a1b2c3d4-1234-5678-abcd-000000000001',
  'a1b2c3d4-1234-5678-abcd-000000001006',
  month_start::date,
  'Landlord',
  'Monthly rent',
  'Expense',
  'a1b2c3d4-1234-5678-abcd-000000000003',
  'a1b2c3d4-1234-5678-abcd-000000000002',
  now()
FROM generate_series('2026-01-01'::date, '2026-08-01'::date, interval '1 month') AS month_start
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------
-- 10. Representative spending for the remaining budgets
-- ---------------------------------------------------------------
WITH months AS (
  SELECT month_start::date, extract(month FROM month_start)::integer AS month_number
  FROM generate_series('2026-01-01'::date, '2026-08-01'::date, interval '1 month') AS month_start
), sample_expenses AS (
  SELECT
    'a1b2c3d4-1234-5678-abcd-000000001001'::uuid AS budget_id,
    month_start + (purchase.day_of_month - 1) AS expense_date,
    purchase.entity,
    purchase.base_amount + ((month_number * purchase.day_of_month) % 17) AS amount
  FROM months
  CROSS JOIN (VALUES
    (3,  'FreshCo', 82),
    (10, 'No Frills', 96),
    (17, 'Costco', 128),
    (24, 'Metro', 74)
  ) AS purchase(day_of_month, entity, base_amount)

  UNION ALL

  SELECT
    'a1b2c3d4-1234-5678-abcd-000000001002'::uuid,
    month_start + (purchase.day_of_month - 1),
    purchase.entity,
    purchase.base_amount + ((month_number * purchase.day_of_month) % 13)
  FROM months
  CROSS JOIN (VALUES
    (5,  'Local Cafe', 24),
    (14, 'Thai Kitchen', 58),
    (26, 'Pizza Place', 42)
  ) AS purchase(day_of_month, entity, base_amount)

  UNION ALL

  SELECT
    'a1b2c3d4-1234-5678-abcd-000000001003'::uuid,
    month_start + (purchase.day_of_month - 1),
    purchase.entity,
    purchase.base_amount + ((month_number * purchase.day_of_month) % 9)
  FROM months
  CROSS JOIN (VALUES
    (8,  'Petro-Canada', 62),
    (22, 'Esso', 68)
  ) AS purchase(day_of_month, entity, base_amount)

  UNION ALL

  SELECT
    'a1b2c3d4-1234-5678-abcd-000000001004'::uuid,
    month_start + 11,
    CASE WHEN month_number % 2 = 0 THEN 'Toronto Hydro' ELSE 'Enbridge Gas' END,
    CASE WHEN month_number IN (1, 2, 7, 8) THEN 142 ELSE 108 END
  FROM months

  UNION ALL

  SELECT
    'a1b2c3d4-1234-5678-abcd-000000001005'::uuid,
    month_start + (purchase.day_of_month - 1),
    purchase.entity,
    purchase.base_amount + ((month_number * purchase.day_of_month) % 8)
  FROM months
  CROSS JOIN (VALUES
    (6,  'Netflix', 23),
    (19, 'Cineplex', 34)
  ) AS purchase(day_of_month, entity, base_amount)
  WHERE month_number IN (1, 2, 4, 5, 7, 8) OR purchase.entity = 'Netflix'
)
INSERT INTO "finance-app"."Budget_Hit" (
  id, amount, user_id, budget_id, date, entity, notes, type,
  account_id, household_id, created_at
)
SELECT
  md5('expense-' || budget_id::text || '-' || expense_date::text || '-' || entity)::uuid,
  amount,
  'a1b2c3d4-1234-5678-abcd-000000000001',
  budget_id,
  expense_date,
  entity,
  'Seeded sample expense',
  'Expense',
  'a1b2c3d4-1234-5678-abcd-000000000004',
  'a1b2c3d4-1234-5678-abcd-000000000002',
  now()
FROM sample_expenses
ON CONFLICT (id) DO NOTHING;
