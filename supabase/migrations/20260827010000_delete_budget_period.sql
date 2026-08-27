CREATE OR REPLACE FUNCTION "finance-app"."delete_budget_period"(
  "target_budget_id" uuid,
  "target_period_date" date
)
RETURNS TABLE ("budget_deleted" boolean)
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
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'Not authorized to delete this budget period.';
  END IF;

  -- Lock the parent so a concurrent hit cannot be attached between the checks
  -- and the possible parent deletion.
  PERFORM 1
  FROM "finance-app"."Budgets"
  WHERE "id" = target_budget_id
    AND "household_id" = current_household_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'Budget not found.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "finance-app"."Budget_Hit"
    WHERE "budget_id" = target_budget_id
      AND "household_id" = current_household_id
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
    AND "date" >= period_start
    AND "date" < period_end;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'Budget period not found.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM "finance-app"."Budget_Hit"
    WHERE "budget_id" = target_budget_id
      AND "household_id" = current_household_id
  ) THEN
    DELETE FROM "finance-app"."Budgets"
    WHERE "id" = target_budget_id
      AND "household_id" = current_household_id;

    RETURN QUERY SELECT true;
    RETURN;
  END IF;

  RETURN QUERY SELECT false;
END;
$$;

REVOKE ALL ON FUNCTION "finance-app"."delete_budget_period"(uuid, date) FROM PUBLIC;
REVOKE ALL ON FUNCTION "finance-app"."delete_budget_period"(uuid, date) FROM anon;
GRANT EXECUTE ON FUNCTION "finance-app"."delete_budget_period"(uuid, date) TO authenticated;
