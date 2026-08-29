DROP TRIGGER IF EXISTS "budget_hit_ensure_period_trg"
ON "finance-app"."Budget_Hit";

DROP FUNCTION IF EXISTS "finance-app"."ensure_budget_period_for_expense"();
DROP FUNCTION IF EXISTS "finance-app"."ensure_current_budget_periods"();
DROP FUNCTION IF EXISTS "finance-app"."reactivate_budget"(uuid);
DROP FUNCTION IF EXISTS "finance-app"."create_budget_with_period"(text, numeric, text, text);
DROP FUNCTION IF EXISTS "finance-app"."update_budget_with_period"(uuid, text, numeric, text, text, boolean, boolean, date);
DROP FUNCTION IF EXISTS "finance-app"."delete_budget_period"(uuid, date);

ALTER TABLE "finance-app"."Budgets"
  DROP CONSTRAINT IF EXISTS "Budgets_amount_positive";

ALTER TABLE "finance-app"."Budgets"
  DROP COLUMN IF EXISTS "amount",
  DROP COLUMN IF EXISTS "inactive";

CREATE OR REPLACE FUNCTION "finance-app"."create_budget_with_period"(
  "budget_name" text,
  "budget_amount" numeric,
  "budget_color" text,
  "budget_icon" text,
  "target_period_date" date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_user_id uuid := (SELECT "auth"."uid"());
  current_household_id uuid;
  period_start date := date_trunc('month', target_period_date)::date;
  created_budget "finance-app"."Budgets"%ROWTYPE;
  created_period "finance-app"."Budget_Period"%ROWTYPE;
BEGIN
  SELECT "household_id"
  INTO current_household_id
  FROM "public"."Household_Member"
  WHERE "user_id" = current_user_id
  LIMIT 1;

  IF current_user_id IS NULL OR current_household_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Not authorized to create a budget.';
  END IF;

  INSERT INTO "finance-app"."Budgets" (
    "name", "color", "icon", "user_id", "household_id"
  )
  VALUES (
    budget_name, budget_color, budget_icon, current_user_id, current_household_id
  )
  RETURNING * INTO created_budget;

  INSERT INTO "finance-app"."Budget_Period" (
    "budget_id", "date", "amount", "user_id", "household_id"
  )
  VALUES (
    created_budget."id", period_start, budget_amount, current_user_id, current_household_id
  )
  RETURNING * INTO created_period;

  RETURN jsonb_build_object(
    'data', to_jsonb(created_budget),
    'periodData', to_jsonb(created_period)
  );
END;
$$;

CREATE OR REPLACE FUNCTION "finance-app"."create_budget_period"(
  "target_budget_id" uuid,
  "budget_amount" numeric,
  "target_period_date" date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_user_id uuid := (SELECT "auth"."uid"());
  current_household_id uuid;
  period_start date := date_trunc('month', target_period_date)::date;
  target_budget "finance-app"."Budgets"%ROWTYPE;
  created_period "finance-app"."Budget_Period"%ROWTYPE;
BEGIN
  SELECT "household_id"
  INTO current_household_id
  FROM "public"."Household_Member"
  WHERE "user_id" = current_user_id
  LIMIT 1;

  IF current_user_id IS NULL OR current_household_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Not authorized to add this budget period.';
  END IF;

  SELECT *
  INTO target_budget
  FROM "finance-app"."Budgets"
  WHERE "id" = target_budget_id
    AND "household_id" = current_household_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Budget not found.';
  END IF;

  INSERT INTO "finance-app"."Budget_Period" (
    "budget_id", "date", "amount", "user_id", "household_id"
  )
  VALUES (
    target_budget."id", period_start, budget_amount, current_user_id, current_household_id
  )
  RETURNING * INTO created_period;

  RETURN to_jsonb(created_period);
END;
$$;

CREATE OR REPLACE FUNCTION "finance-app"."update_budget_period"(
  "target_budget_id" uuid,
  "budget_amount" numeric,
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
  updated_period "finance-app"."Budget_Period"%ROWTYPE;
BEGIN
  SELECT "household_id"
  INTO current_household_id
  FROM "public"."Household_Member"
  WHERE "user_id" = (SELECT "auth"."uid"())
  LIMIT 1;

  IF current_household_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Not authorized to update this budget period.';
  END IF;

  UPDATE "finance-app"."Budget_Period"
  SET "amount" = budget_amount
  WHERE "budget_id" = target_budget_id
    AND "household_id" = current_household_id
    AND "date" = period_start
  RETURNING * INTO updated_period;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Budget period not found.';
  END IF;

  RETURN to_jsonb(updated_period);
END;
$$;

CREATE OR REPLACE FUNCTION "finance-app"."update_budget_metadata"(
  "target_budget_id" uuid,
  "budget_name" text,
  "budget_color" text,
  "budget_icon" text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_household_id uuid;
  updated_budget "finance-app"."Budgets"%ROWTYPE;
BEGIN
  SELECT "household_id"
  INTO current_household_id
  FROM "public"."Household_Member"
  WHERE "user_id" = (SELECT "auth"."uid"())
  LIMIT 1;

  IF current_household_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Not authorized to update this budget.';
  END IF;

  UPDATE "finance-app"."Budgets"
  SET "name" = budget_name,
      "color" = budget_color,
      "icon" = budget_icon
  WHERE "id" = target_budget_id
    AND "household_id" = current_household_id
  RETURNING * INTO updated_budget;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Budget not found.';
  END IF;

  RETURN to_jsonb(updated_budget);
END;
$$;

CREATE OR REPLACE FUNCTION "finance-app"."delete_budget_period"(
  "target_budget_id" uuid,
  "target_period_date" date
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  period_start date := date_trunc('month', target_period_date)::date;
  period_end date := (date_trunc('month', target_period_date) + interval '1 month')::date;
  current_household_id uuid;
BEGIN
  SELECT "household_id"
  INTO current_household_id
  FROM "public"."Household_Member"
  WHERE "user_id" = (SELECT "auth"."uid"())
  LIMIT 1;

  IF current_household_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Not authorized to delete this budget period.';
  END IF;

  PERFORM 1
  FROM "finance-app"."Budgets"
  WHERE "id" = target_budget_id
    AND "household_id" = current_household_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Budget not found.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "finance-app"."Budget_Hit"
    WHERE "budget_id" = target_budget_id
      AND "household_id" = current_household_id
      AND "type" = 'Expense'
      AND "date" >= period_start
      AND "date" < period_end
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'This budget period has expense records and cannot be deleted.';
  END IF;

  DELETE FROM "finance-app"."Budget_Period"
  WHERE "budget_id" = target_budget_id
    AND "household_id" = current_household_id
    AND "date" = period_start;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Budget period not found.';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION "finance-app"."copy_previous_budget_periods"(
  "target_period_date" date
)
RETURNS TABLE ("copied_count" integer, "skipped_count" integer, "source_count" integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_user_id uuid := (SELECT "auth"."uid"());
  current_household_id uuid;
  destination_start date := date_trunc('month', target_period_date)::date;
  source_start date := (date_trunc('month', target_period_date) - interval '1 month')::date;
  inserted_count integer := 0;
  total_count integer := 0;
BEGIN
  SELECT "household_id"
  INTO current_household_id
  FROM "public"."Household_Member"
  WHERE "user_id" = current_user_id
  LIMIT 1;

  IF current_user_id IS NULL OR current_household_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Not authorized to copy budget periods.';
  END IF;

  SELECT count(*)::integer
  INTO total_count
  FROM "finance-app"."Budget_Period"
  WHERE "household_id" = current_household_id
    AND "date" = source_start;

  INSERT INTO "finance-app"."Budget_Period" (
    "budget_id", "date", "amount", "user_id", "household_id"
  )
  SELECT
    source."budget_id",
    destination_start,
    source."amount",
    current_user_id,
    current_household_id
  FROM "finance-app"."Budget_Period" AS source
  WHERE source."household_id" = current_household_id
    AND source."date" = source_start
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;

  RETURN QUERY SELECT inserted_count, total_count - inserted_count, total_count;
END;
$$;

CREATE OR REPLACE FUNCTION "finance-app"."validate_budget_period_for_expense"()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW."type" = 'Expense'
    AND NEW."budget_id" IS NOT NULL
    AND NEW."date" IS NOT NULL
  THEN
    -- Serialize expense writes with period deletion for this parent.
    PERFORM 1
    FROM "finance-app"."Budgets"
    WHERE "id" = NEW."budget_id"
      AND "household_id" = NEW."household_id"
    FOR KEY SHARE;

    IF NOT FOUND OR NOT EXISTS (
      SELECT 1
      FROM "finance-app"."Budget_Period"
      WHERE "budget_id" = NEW."budget_id"
        AND "household_id" = NEW."household_id"
        AND "date" = date_trunc('month', NEW."date"::timestamp)::date
    )
    THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0003',
        MESSAGE = 'Selected budget does not have a period for the expense month.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "budget_hit_validate_period_trg"
BEFORE INSERT OR UPDATE OF "budget_id", "date", "type", "household_id"
ON "finance-app"."Budget_Hit"
FOR EACH ROW
EXECUTE FUNCTION "finance-app"."validate_budget_period_for_expense"();

REVOKE ALL ON FUNCTION "finance-app"."create_budget_with_period"(text, numeric, text, text, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION "finance-app"."create_budget_with_period"(text, numeric, text, text, date) TO authenticated;

REVOKE ALL ON FUNCTION "finance-app"."create_budget_period"(uuid, numeric, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION "finance-app"."create_budget_period"(uuid, numeric, date) TO authenticated;

REVOKE ALL ON FUNCTION "finance-app"."update_budget_period"(uuid, numeric, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION "finance-app"."update_budget_period"(uuid, numeric, date) TO authenticated;

REVOKE ALL ON FUNCTION "finance-app"."update_budget_metadata"(uuid, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION "finance-app"."update_budget_metadata"(uuid, text, text, text) TO authenticated;

REVOKE ALL ON FUNCTION "finance-app"."delete_budget_period"(uuid, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION "finance-app"."delete_budget_period"(uuid, date) TO authenticated;

REVOKE ALL ON FUNCTION "finance-app"."copy_previous_budget_periods"(date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION "finance-app"."copy_previous_budget_periods"(date) TO authenticated;

REVOKE ALL ON FUNCTION "finance-app"."validate_budget_period_for_expense"() FROM PUBLIC, anon, authenticated;
