ALTER TABLE "finance-app"."Budget_Hit"
  ADD COLUMN "destination_account_id" uuid;

ALTER TABLE "finance-app"."Budget_Hit"
  DROP CONSTRAINT "Budget_Hit_type_valid";

ALTER TABLE "finance-app"."Budget_Hit"
  ADD CONSTRAINT "Budget_Hit_type_valid"
  CHECK ("type" IN ('Expense', 'Income', 'Transfer'));

ALTER TABLE "finance-app"."Budget_Hit"
  ADD CONSTRAINT "Budget_Hit_transfer_shape_valid"
  CHECK (
    (
      "type" = 'Transfer'
      AND "budget_id" IS NULL
      AND "account_id" IS NOT NULL
      AND "destination_account_id" IS NOT NULL
      AND "account_id" <> "destination_account_id"
      AND "amount" IS NOT NULL
      AND "amount" > 0
      AND "date" IS NOT NULL
    ) OR (
      "type" <> 'Transfer'
      AND "destination_account_id" IS NULL
    )
  );

CREATE INDEX "Budget_Hit_household_type_date_idx"
ON "finance-app"."Budget_Hit" ("household_id", "type", "date" DESC);

CREATE FUNCTION "finance-app"."validate_transfer_accounts"()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW."type" <> 'Transfer' THEN
    RETURN NEW;
  END IF;

  PERFORM 1
  FROM "finance-app"."Account"
  WHERE "id" = NEW."account_id"
    AND "household_id" = NEW."household_id"
  FOR KEY SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Source account not found.';
  END IF;

  PERFORM 1
  FROM "finance-app"."Account"
  WHERE "id" = NEW."destination_account_id"
    AND "household_id" = NEW."household_id"
  FOR KEY SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Destination account not found.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "budget_hit_validate_transfer_accounts_trg"
BEFORE INSERT OR UPDATE OF "type", "account_id", "destination_account_id", "household_id"
ON "finance-app"."Budget_Hit"
FOR EACH ROW EXECUTE FUNCTION "finance-app"."validate_transfer_accounts"();

CREATE FUNCTION "finance-app"."prevent_transfer_account_delete"()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "finance-app"."Budget_Hit"
    WHERE "type" = 'Transfer'
      AND ("account_id" = OLD."id" OR "destination_account_id" = OLD."id")
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001',
      MESSAGE = 'Account has transfer history and cannot be deleted.';
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER "account_prevent_transfer_delete_trg"
BEFORE DELETE ON "finance-app"."Account"
FOR EACH ROW EXECUTE FUNCTION "finance-app"."prevent_transfer_account_delete"();

CREATE FUNCTION "finance-app"."delete_account"("target_account_id" uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_household_id uuid;
BEGIN
  SELECT "household_id" INTO current_household_id
  FROM "public"."Household_Member"
  WHERE "user_id" = auth.uid()
  LIMIT 1;

  IF current_household_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Household not found.';
  END IF;

  PERFORM 1
  FROM "finance-app"."Account"
  WHERE "id" = target_account_id
    AND "household_id" = current_household_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Account not found.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "finance-app"."Budget_Hit"
    WHERE "household_id" = current_household_id
      AND "type" = 'Transfer'
      AND ("account_id" = target_account_id OR "destination_account_id" = target_account_id)
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001',
      MESSAGE = 'Account has transfer history and cannot be deleted.';
  END IF;

  DELETE FROM "finance-app"."Account_Value"
  WHERE "account_id" = target_account_id
    AND "household_id" = current_household_id;

  DELETE FROM "finance-app"."Account"
  WHERE "id" = target_account_id
    AND "household_id" = current_household_id;
END;
$$;

REVOKE ALL ON FUNCTION "finance-app"."validate_transfer_accounts"() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION "finance-app"."prevent_transfer_account_delete"() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION "finance-app"."delete_account"(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION "finance-app"."delete_account"(uuid) TO authenticated;
