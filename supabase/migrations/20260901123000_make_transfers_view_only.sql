CREATE FUNCTION "finance-app"."prevent_transfer_modification"()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF OLD."type" = 'Transfer' OR (TG_OP = 'UPDATE' AND NEW."type" = 'Transfer') THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'Transfers are view-only.';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

CREATE TRIGGER "budget_hit_prevent_transfer_modification_trg"
BEFORE UPDATE OR DELETE ON "finance-app"."Budget_Hit"
FOR EACH ROW EXECUTE FUNCTION "finance-app"."prevent_transfer_modification"();

REVOKE ALL ON FUNCTION "finance-app"."prevent_transfer_modification"() FROM PUBLIC, anon, authenticated;
