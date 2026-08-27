CREATE OR REPLACE FUNCTION "finance-app"."reactivate_budget"("target_budget_id" uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_household_id uuid;
  current_month_start date := date_trunc('month', CURRENT_DATE)::date;
  target_budget "finance-app"."Budgets"%ROWTYPE;
BEGIN
  SELECT "household_id"
  INTO current_household_id
  FROM "public"."Household_Member"
  WHERE "user_id" = (SELECT "auth"."uid"())
  LIMIT 1;

  IF current_household_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Not authorized to reactivate this budget.';
  END IF;

  SELECT *
  INTO target_budget
  FROM "finance-app"."Budgets"
  WHERE "id" = target_budget_id
    AND "household_id" = current_household_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Budget not found.';
  END IF;

  INSERT INTO "finance-app"."Budget_Period" ("budget_id", "date", "amount", "user_id", "household_id")
  VALUES (
    target_budget."id",
    current_month_start,
    target_budget."amount",
    target_budget."user_id",
    target_budget."household_id"
  )
  ON CONFLICT DO NOTHING;

  UPDATE "finance-app"."Budgets"
  SET "inactive" = false
  WHERE "id" = target_budget."id";
END;
$$;

REVOKE ALL ON FUNCTION "finance-app"."reactivate_budget"(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION "finance-app"."reactivate_budget"(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION "finance-app"."reactivate_budget"(uuid) TO authenticated;
