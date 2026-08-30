ALTER TABLE "finance-app"."Budgets"
  ADD COLUMN "type" text NOT NULL DEFAULT 'Expense';

ALTER TABLE "finance-app"."Budgets"
  ADD CONSTRAINT "Budgets_type_valid"
  CHECK ("type" IN ('Expense', 'Income'));

ALTER TABLE "finance-app"."Budget_Hit"
  ADD CONSTRAINT "Budget_Hit_type_valid"
  CHECK ("type" IN ('Expense', 'Income'));

ALTER TABLE "finance-app"."Budget_Hit"
  ALTER COLUMN "type" SET NOT NULL;

DROP INDEX IF EXISTS "finance-app"."Budgets_household_id_name_key";

CREATE UNIQUE INDEX "Budgets_household_id_type_name_key"
  ON "finance-app"."Budgets" ("household_id", "type", "name")
  WHERE "household_id" IS NOT NULL AND "name" IS NOT NULL;

DROP FUNCTION IF EXISTS "finance-app"."create_budget_with_period"(text, numeric, text, text, date);

CREATE FUNCTION "finance-app"."create_budget_with_period"(
  "budget_name" text,
  "budget_amount" numeric,
  "budget_color" text,
  "budget_icon" text,
  "budget_type" text,
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
  IF budget_type NOT IN ('Expense', 'Income') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Budget type must be Expense or Income.';
  END IF;

  SELECT "household_id" INTO current_household_id
  FROM "public"."Household_Member"
  WHERE "user_id" = current_user_id
  LIMIT 1;

  IF current_user_id IS NULL OR current_household_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Not authorized to create a budget.';
  END IF;

  INSERT INTO "finance-app"."Budgets" (
    "name", "color", "icon", "type", "user_id", "household_id"
  ) VALUES (
    budget_name, budget_color, budget_icon, budget_type, current_user_id, current_household_id
  ) RETURNING * INTO created_budget;

  INSERT INTO "finance-app"."Budget_Period" (
    "budget_id", "date", "amount", "user_id", "household_id"
  ) VALUES (
    created_budget."id", period_start, budget_amount, current_user_id, current_household_id
  ) RETURNING * INTO created_period;

  RETURN jsonb_build_object('data', to_jsonb(created_budget), 'periodData', to_jsonb(created_period));
END;
$$;

REVOKE ALL ON FUNCTION "finance-app"."create_budget_with_period"(text, numeric, text, text, text, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION "finance-app"."create_budget_with_period"(text, numeric, text, text, text, date) TO authenticated;

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
  SELECT "household_id" INTO current_household_id
  FROM "public"."Household_Member"
  WHERE "user_id" = (SELECT "auth"."uid"())
  LIMIT 1;

  IF current_household_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Not authorized to delete this budget period.';
  END IF;

  PERFORM 1 FROM "finance-app"."Budgets"
  WHERE "id" = target_budget_id AND "household_id" = current_household_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Budget not found.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "finance-app"."Budget_Hit"
    WHERE "budget_id" = target_budget_id
      AND "household_id" = current_household_id
      AND "date" >= period_start AND "date" < period_end
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001',
      MESSAGE = 'This budget period has transaction records and cannot be deleted.';
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

DROP TRIGGER IF EXISTS "budget_hit_validate_period_trg" ON "finance-app"."Budget_Hit";
DROP FUNCTION IF EXISTS "finance-app"."validate_budget_period_for_expense"();

CREATE FUNCTION "finance-app"."validate_budget_for_hit"()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  target_type text;
BEGIN
  IF NEW."budget_id" IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT "type" INTO target_type
  FROM "finance-app"."Budgets"
  WHERE "id" = NEW."budget_id" AND "household_id" = NEW."household_id"
  FOR KEY SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Budget not found.';
  END IF;

  IF target_type <> NEW."type" THEN
    RAISE EXCEPTION USING ERRCODE = 'P0004', MESSAGE = 'Transaction type does not match budget type.';
  END IF;

  IF NEW."date" IS NULL OR NOT EXISTS (
    SELECT 1 FROM "finance-app"."Budget_Period"
    WHERE "budget_id" = NEW."budget_id"
      AND "household_id" = NEW."household_id"
      AND "date" = date_trunc('month', NEW."date"::timestamp)::date
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0003',
      MESSAGE = 'Selected budget does not have a period for the transaction month.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "budget_hit_validate_budget_trg"
BEFORE INSERT OR UPDATE OF "budget_id", "date", "type", "household_id"
ON "finance-app"."Budget_Hit"
FOR EACH ROW EXECUTE FUNCTION "finance-app"."validate_budget_for_hit"();

REVOKE ALL ON FUNCTION "finance-app"."validate_budget_for_hit"() FROM PUBLIC, anon, authenticated;

DROP FUNCTION IF EXISTS "finance-app"."copy_previous_budget_periods"(date);

CREATE FUNCTION "finance-app"."copy_previous_budget_periods"(
  "target_period_date" date,
  "budget_type" text
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
  IF budget_type NOT IN ('Expense', 'Income') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Budget type must be Expense or Income.';
  END IF;

  SELECT "household_id" INTO current_household_id
  FROM "public"."Household_Member"
  WHERE "user_id" = current_user_id LIMIT 1;

  IF current_user_id IS NULL OR current_household_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Not authorized to copy budget periods.';
  END IF;

  SELECT count(*)::integer INTO total_count
  FROM "finance-app"."Budget_Period" AS source
  JOIN "finance-app"."Budgets" AS budget ON budget."id" = source."budget_id"
  WHERE source."household_id" = current_household_id
    AND source."date" = source_start
    AND budget."type" = budget_type;

  INSERT INTO "finance-app"."Budget_Period" (
    "budget_id", "date", "amount", "user_id", "household_id"
  )
  SELECT source."budget_id", destination_start, source."amount", current_user_id, current_household_id
  FROM "finance-app"."Budget_Period" AS source
  JOIN "finance-app"."Budgets" AS budget ON budget."id" = source."budget_id"
  WHERE source."household_id" = current_household_id
    AND source."date" = source_start
    AND budget."type" = budget_type
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN QUERY SELECT inserted_count, total_count - inserted_count, total_count;
END;
$$;

REVOKE ALL ON FUNCTION "finance-app"."copy_previous_budget_periods"(date, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION "finance-app"."copy_previous_budget_periods"(date, text) TO authenticated;
