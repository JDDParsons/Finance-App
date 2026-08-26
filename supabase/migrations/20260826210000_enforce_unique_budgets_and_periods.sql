DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "finance-app"."Budgets"
    WHERE "household_id" IS NOT NULL
      AND "name" IS NOT NULL
    GROUP BY "household_id", "name"
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Cannot enforce unique budget names: duplicate (household_id, name) values exist in finance-app.Budgets';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "finance-app"."Budget_Period"
    WHERE "budget_id" IS NOT NULL
      AND "date" IS NOT NULL
    GROUP BY "budget_id", date_trunc('month', "date"::timestamp)
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Cannot enforce one budget period per month: duplicate (budget_id, month) values exist in finance-app.Budget_Period';
  END IF;
END
$$;

CREATE UNIQUE INDEX "Budgets_household_id_name_key"
  ON "finance-app"."Budgets" ("household_id", "name")
  WHERE "household_id" IS NOT NULL
    AND "name" IS NOT NULL;

CREATE UNIQUE INDEX "Budget_Period_budget_id_month_key"
  ON "finance-app"."Budget_Period" (
    "budget_id",
    (date_trunc('month', "date"::timestamp))
  )
  WHERE "budget_id" IS NOT NULL
    AND "date" IS NOT NULL;
