CREATE OR REPLACE FUNCTION "finance-app"."create_budget_with_period"(
  "budget_name" text,
  "budget_amount" numeric,
  "budget_color" text,
  "budget_icon" text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_user_id uuid := (SELECT "auth"."uid"());
  current_household_id uuid;
  current_month_start date := date_trunc('month', CURRENT_DATE)::date;
  created_budget "finance-app"."Budgets"%ROWTYPE;
  created_period "finance-app"."Budget_Period"%ROWTYPE;
BEGIN
  SELECT "household_id"
  INTO current_household_id
  FROM "public"."Household_Member"
  WHERE "user_id" = current_user_id
  LIMIT 1;

  IF current_user_id IS NULL OR current_household_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'Not authorized to create a budget.';
  END IF;

  INSERT INTO "finance-app"."Budgets" (
    "name", "amount", "color", "icon", "user_id", "household_id"
  )
  VALUES (
    budget_name, budget_amount, budget_color, budget_icon, current_user_id, current_household_id
  )
  RETURNING * INTO created_budget;

  INSERT INTO "finance-app"."Budget_Period" (
    "budget_id", "date", "amount", "user_id", "household_id"
  )
  VALUES (
    created_budget."id",
    current_month_start,
    budget_amount,
    current_user_id,
    current_household_id
  )
  RETURNING * INTO created_period;

  RETURN jsonb_build_object(
    'data', to_jsonb(created_budget),
    'periodData', to_jsonb(created_period)
  );
END;
$$;

CREATE OR REPLACE FUNCTION "finance-app"."update_budget_with_period"(
  "target_budget_id" uuid,
  "budget_name" text,
  "budget_amount" numeric,
  "budget_color" text,
  "budget_icon" text,
  "update_color" boolean,
  "update_icon" boolean,
  "target_period_date" date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_household_id uuid;
  period_start date := date_trunc('month', target_period_date)::date;
  updated_budget "finance-app"."Budgets"%ROWTYPE;
  updated_period "finance-app"."Budget_Period"%ROWTYPE;
BEGIN
  SELECT "household_id"
  INTO current_household_id
  FROM "public"."Household_Member"
  WHERE "user_id" = (SELECT "auth"."uid"())
  LIMIT 1;

  IF current_household_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'Not authorized to update this budget.';
  END IF;

  UPDATE "finance-app"."Budgets" AS existing_budget
  SET
    "name" = budget_name,
    "amount" = budget_amount,
    "color" = CASE WHEN update_color THEN budget_color ELSE existing_budget."color" END,
    "icon" = CASE WHEN update_icon THEN budget_icon ELSE existing_budget."icon" END
  WHERE existing_budget."id" = target_budget_id
    AND existing_budget."household_id" = current_household_id
  RETURNING existing_budget.* INTO updated_budget;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'Budget not found.';
  END IF;

  UPDATE "finance-app"."Budget_Period" AS existing_period
  SET "amount" = budget_amount
  WHERE existing_period."budget_id" = target_budget_id
    AND existing_period."household_id" = current_household_id
    AND existing_period."date" = period_start
  RETURNING existing_period.* INTO updated_period;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'Budget period not found.';
  END IF;

  RETURN jsonb_build_object(
    'data', to_jsonb(updated_budget),
    'periodData', to_jsonb(updated_period)
  );
END;
$$;

CREATE OR REPLACE FUNCTION "finance-app"."ensure_current_budget_periods"()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_household_id uuid;
  current_month_start date := date_trunc('month', CURRENT_DATE)::date;
BEGIN
  SELECT "household_id"
  INTO current_household_id
  FROM "public"."Household_Member"
  WHERE "user_id" = (SELECT "auth"."uid"())
  LIMIT 1;

  IF current_household_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'Not authorized to provision budget periods.';
  END IF;

  INSERT INTO "finance-app"."Budget_Period" (
    "budget_id", "date", "amount", "user_id", "household_id"
  )
  SELECT
    budget."id",
    current_month_start,
    budget."amount",
    budget."user_id",
    budget."household_id"
  FROM "finance-app"."Budgets" AS budget
  WHERE budget."household_id" = current_household_id
    AND budget."inactive" = false
  ON CONFLICT DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION "finance-app"."create_budget_with_period"(text, numeric, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION "finance-app"."create_budget_with_period"(text, numeric, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION "finance-app"."create_budget_with_period"(text, numeric, text, text) TO authenticated;

REVOKE ALL ON FUNCTION "finance-app"."update_budget_with_period"(uuid, text, numeric, text, text, boolean, boolean, date) FROM PUBLIC;
REVOKE ALL ON FUNCTION "finance-app"."update_budget_with_period"(uuid, text, numeric, text, text, boolean, boolean, date) FROM anon;
GRANT EXECUTE ON FUNCTION "finance-app"."update_budget_with_period"(uuid, text, numeric, text, text, boolean, boolean, date) TO authenticated;

REVOKE ALL ON FUNCTION "finance-app"."ensure_current_budget_periods"() FROM PUBLIC;
REVOKE ALL ON FUNCTION "finance-app"."ensure_current_budget_periods"() FROM anon;
GRANT EXECUTE ON FUNCTION "finance-app"."ensure_current_budget_periods"() TO authenticated;
