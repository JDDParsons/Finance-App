DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'finance-app'
      AND table_name = 'Budget_Hit'
      AND column_name = 'note'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'finance-app'
      AND table_name = 'Budget_Hit'
      AND column_name = 'entity'
  ) THEN
    ALTER TABLE "finance-app"."Budget_Hit" RENAME COLUMN "note" TO "entity";
  END IF;
END $$;
