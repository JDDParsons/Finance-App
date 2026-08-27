-- Repair existing expenses that reference a budget without having a period in
-- the expense month. The budget's default amount becomes that month's amount.
INSERT INTO "finance-app"."Budget_Period" (
  "budget_id",
  "date",
  "amount",
  "user_id",
  "household_id"
)
SELECT
  budget."id",
  date_trunc('month', hit."date"::timestamp)::date,
  budget."amount",
  budget."user_id",
  budget."household_id"
FROM "finance-app"."Budget_Hit" AS hit
JOIN "finance-app"."Budgets" AS budget
  ON budget."id" = hit."budget_id"
  AND budget."household_id" = hit."household_id"
WHERE hit."type" = 'Expense'
  AND hit."budget_id" IS NOT NULL
  AND hit."date" IS NOT NULL
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION "finance-app"."ensure_budget_period_for_expense"()
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
    INSERT INTO "finance-app"."Budget_Period" (
      "budget_id",
      "date",
      "amount",
      "user_id",
      "household_id"
    )
    SELECT
      budget."id",
      date_trunc('month', NEW."date"::timestamp)::date,
      budget."amount",
      budget."user_id",
      budget."household_id"
    FROM "finance-app"."Budgets" AS budget
    WHERE budget."id" = NEW."budget_id"
      AND budget."household_id" = NEW."household_id"
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION "finance-app"."ensure_budget_period_for_expense"() FROM PUBLIC;
REVOKE ALL ON FUNCTION "finance-app"."ensure_budget_period_for_expense"() FROM anon;
REVOKE ALL ON FUNCTION "finance-app"."ensure_budget_period_for_expense"() FROM authenticated;

DROP TRIGGER IF EXISTS "budget_hit_ensure_period_trg"
ON "finance-app"."Budget_Hit";

CREATE TRIGGER "budget_hit_ensure_period_trg"
AFTER INSERT OR UPDATE OF "budget_id", "date", "type", "household_id"
ON "finance-app"."Budget_Hit"
FOR EACH ROW
EXECUTE FUNCTION "finance-app"."ensure_budget_period_for_expense"();
