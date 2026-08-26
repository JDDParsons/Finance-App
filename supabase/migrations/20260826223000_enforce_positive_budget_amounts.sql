DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "finance-app"."Budgets"
    WHERE "amount" IS NULL OR "amount" <= 0
  ) THEN
    RAISE EXCEPTION
      'Cannot enforce positive budget amounts: null or non-positive values exist in finance-app.Budgets';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "finance-app"."Budget_Period"
    WHERE "amount" IS NULL OR "amount" <= 0
  ) THEN
    RAISE EXCEPTION
      'Cannot enforce positive budget amounts: null or non-positive values exist in finance-app.Budget_Period';
  END IF;
END
$$;

ALTER TABLE "finance-app"."Budgets"
  ADD CONSTRAINT "Budgets_amount_positive"
  CHECK ("amount" IS NOT NULL AND "amount" > 0);

ALTER TABLE "finance-app"."Budget_Period"
  ADD CONSTRAINT "Budget_Period_amount_positive"
  CHECK ("amount" IS NOT NULL AND "amount" > 0);
