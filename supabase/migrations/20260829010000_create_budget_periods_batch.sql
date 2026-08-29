CREATE OR REPLACE FUNCTION "finance-app"."create_budget_periods"(
  "target_budget_ids" uuid[],
  "budget_amounts" numeric[],
  "target_period_date" date
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_user_id uuid := (SELECT "auth"."uid"());
  current_household_id uuid;
  period_start date := date_trunc('month', target_period_date)::date;
  requested_count integer := cardinality(target_budget_ids);
  inserted_count integer := 0;
BEGIN
  SELECT "household_id"
  INTO current_household_id
  FROM "public"."Household_Member"
  WHERE "user_id" = current_user_id
  LIMIT 1;

  IF current_user_id IS NULL OR current_household_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Not authorized to add budget periods.';
  END IF;

  IF requested_count IS NULL
    OR requested_count = 0
    OR requested_count <> cardinality(budget_amounts)
    OR requested_count <> (SELECT count(DISTINCT value) FROM unnest(target_budget_ids) AS ids(value))
  THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Budget IDs and amounts must be non-empty matching lists.';
  END IF;

  IF requested_count <> (
    SELECT count(*)
    FROM "finance-app"."Budgets"
    WHERE "id" = ANY(target_budget_ids)
      AND "household_id" = current_household_id
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'One or more budgets were not found.';
  END IF;

  INSERT INTO "finance-app"."Budget_Period" (
    "budget_id", "date", "amount", "user_id", "household_id"
  )
  SELECT
    requested."budget_id",
    period_start,
    requested."amount",
    current_user_id,
    current_household_id
  FROM unnest(target_budget_ids, budget_amounts) AS requested("budget_id", "amount");

  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END;
$$;

REVOKE ALL ON FUNCTION "finance-app"."create_budget_periods"(uuid[], numeric[], date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION "finance-app"."create_budget_periods"(uuid[], numeric[], date) TO authenticated;
