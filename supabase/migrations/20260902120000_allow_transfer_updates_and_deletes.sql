DROP TRIGGER IF EXISTS "budget_hit_prevent_transfer_modification_trg"
ON "finance-app"."Budget_Hit";

DROP FUNCTION IF EXISTS "finance-app"."prevent_transfer_modification"();
