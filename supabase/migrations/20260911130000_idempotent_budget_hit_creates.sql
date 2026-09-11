ALTER TABLE "finance-app"."Budget_Hit"
  ADD COLUMN "client_operation_id" uuid;

CREATE UNIQUE INDEX "Budget_Hit_household_client_operation_key"
  ON "finance-app"."Budget_Hit" ("household_id", "client_operation_id")
  WHERE "client_operation_id" IS NOT NULL;

CREATE FUNCTION "finance-app"."create_budget_hit_idempotent"(
  "operation_id" uuid,
  "transaction_type" text,
  "transaction_amount" numeric,
  "transaction_date" date,
  "transaction_entity" text,
  "transaction_notes" text,
  "source_account_id" uuid,
  "destination_account_id" uuid,
  "target_budget_id" uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_user_id uuid := (SELECT "auth"."uid"());
  current_household_id uuid;
  existing_hit "finance-app"."Budget_Hit"%ROWTYPE;
  created_hit "finance-app"."Budget_Hit"%ROWTYPE;
BEGIN
  IF operation_id IS NULL OR transaction_type NOT IN ('Expense', 'Income', 'Transfer') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid offline transaction operation.';
  END IF;

  SELECT "household_id" INTO current_household_id
  FROM "public"."Household_Member"
  WHERE "user_id" = current_user_id
  LIMIT 1;

  IF current_user_id IS NULL OR current_household_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Not authorized to create this transaction.';
  END IF;

  IF source_account_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM "finance-app"."Account"
    WHERE "id" = source_account_id
      AND "household_id" = current_household_id
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Source account was not found.';
  END IF;

  IF destination_account_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM "finance-app"."Account"
    WHERE "id" = destination_account_id
      AND "household_id" = current_household_id
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Destination account was not found.';
  END IF;

  SELECT * INTO existing_hit
  FROM "finance-app"."Budget_Hit"
  WHERE "household_id" = current_household_id
    AND "client_operation_id" = operation_id;

  IF FOUND THEN
    IF existing_hit."type" IS DISTINCT FROM transaction_type
      OR existing_hit."amount" IS DISTINCT FROM transaction_amount
      OR existing_hit."date" IS DISTINCT FROM transaction_date
      OR existing_hit."entity" IS DISTINCT FROM transaction_entity
      OR existing_hit."notes" IS DISTINCT FROM transaction_notes
      OR existing_hit."account_id" IS DISTINCT FROM source_account_id
      OR existing_hit."destination_account_id" IS DISTINCT FROM destination_account_id
      OR existing_hit."budget_id" IS DISTINCT FROM target_budget_id
    THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Operation ID was already used with different data.';
    END IF;
    RETURN to_jsonb(existing_hit);
  END IF;

  INSERT INTO "finance-app"."Budget_Hit" (
    "id", "client_operation_id", "amount", "date", "entity", "notes", "type",
    "account_id", "destination_account_id", "budget_id", "user_id", "household_id"
  ) VALUES (
    operation_id, operation_id, transaction_amount, transaction_date,
    CASE WHEN transaction_type = 'Transfer' THEN NULL ELSE transaction_entity END,
    CASE WHEN transaction_type = 'Transfer' THEN NULL ELSE transaction_notes END,
    transaction_type, source_account_id, destination_account_id, target_budget_id,
    current_user_id, current_household_id
  )
  ON CONFLICT ("household_id", "client_operation_id")
    WHERE "client_operation_id" IS NOT NULL
  DO NOTHING
  RETURNING * INTO created_hit;

  IF NOT FOUND THEN
    SELECT * INTO existing_hit
    FROM "finance-app"."Budget_Hit"
    WHERE "household_id" = current_household_id
      AND "client_operation_id" = operation_id;

    IF existing_hit."type" IS DISTINCT FROM transaction_type
      OR existing_hit."amount" IS DISTINCT FROM transaction_amount
      OR existing_hit."date" IS DISTINCT FROM transaction_date
      OR existing_hit."entity" IS DISTINCT FROM transaction_entity
      OR existing_hit."notes" IS DISTINCT FROM transaction_notes
      OR existing_hit."account_id" IS DISTINCT FROM source_account_id
      OR existing_hit."destination_account_id" IS DISTINCT FROM destination_account_id
      OR existing_hit."budget_id" IS DISTINCT FROM target_budget_id
    THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Operation ID was already used with different data.';
    END IF;
    RETURN to_jsonb(existing_hit);
  END IF;

  RETURN to_jsonb(created_hit);
END;
$$;

REVOKE ALL ON FUNCTION "finance-app"."create_budget_hit_idempotent"(
  uuid, text, numeric, date, text, text, uuid, uuid, uuid
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION "finance-app"."create_budget_hit_idempotent"(
  uuid, text, numeric, date, text, text, uuid, uuid, uuid
) TO authenticated;
