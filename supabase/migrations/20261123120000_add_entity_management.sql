-- Entity (payer or payee) management for the Settings page.
--
-- An entity is the free-text "entity" on an expense or income row. There is no
-- entity table. These functions group rows by a normalized key so look-alike
-- spellings ("Costco", "costco ", "COSTCO") count as one entity, and let the
-- user rename or merge entities. A rename changes many rows and must succeed or
-- fail as a whole, so it is a function. Both functions only touch the caller's
-- household, and only Expense and Income rows (never Transfer rows).

-- Normalized form: Unicode-normalized, trimmed, internal whitespace collapsed, lower case.
CREATE FUNCTION "finance-app"."entity_key"("entity" text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT lower(
    btrim(
      regexp_replace(normalize(coalesce("entity", ''), NFKC), '\s+', ' ', 'g')
    )
  );
$$;

CREATE FUNCTION "finance-app"."list_entities"()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_user_id uuid := (SELECT "auth"."uid"());
  current_household_id uuid;
BEGIN
  SELECT "household_id" INTO current_household_id
  FROM "public"."Household_Member"
  WHERE "user_id" = current_user_id
  LIMIT 1;

  IF current_user_id IS NULL OR current_household_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Not authorized to view entities.';
  END IF;

  RETURN coalesce((
    WITH entity_rows AS (
      SELECT
        "finance-app"."entity_key"("entity") AS "key",
        btrim(regexp_replace("entity", '\s+', ' ', 'g')) AS "spelling",
        "type",
        "amount",
        "date"
      FROM "finance-app"."Budget_Hit"
      WHERE "household_id" = current_household_id
        AND "type" IN ('Expense', 'Income')
        AND "finance-app"."entity_key"("entity") <> ''
    ),
    spellings AS (
      SELECT "key", "spelling", count(*) AS "uses", max("date") AS "latest"
      FROM entity_rows
      GROUP BY "key", "spelling"
    ),
    display_names AS (
      -- The spelling shown for a group: the most used one, then the most recent.
      SELECT DISTINCT ON ("key") "key", "spelling"
      FROM spellings
      ORDER BY "key", "uses" DESC, "latest" DESC, "spelling"
    ),
    totals AS (
      SELECT
        "key",
        count(*) FILTER (WHERE "type" = 'Expense') AS "expense_count",
        count(*) FILTER (WHERE "type" = 'Income') AS "income_count",
        coalesce(sum("amount") FILTER (WHERE "type" = 'Expense'), 0) AS "expense_total",
        coalesce(sum("amount") FILTER (WHERE "type" = 'Income'), 0) AS "income_total"
      FROM entity_rows
      GROUP BY "key"
    )
    SELECT jsonb_agg(
      jsonb_build_object(
        'key', totals."key",
        'name', display_names."spelling",
        'expenseCount', totals."expense_count",
        'incomeCount', totals."income_count",
        'expenseTotal', totals."expense_total",
        'incomeTotal', totals."income_total"
      )
      ORDER BY lower(display_names."spelling"), totals."key"
    )
    FROM totals
    JOIN display_names USING ("key")
  ), '[]'::jsonb);
END;
$$;

-- Renames every expense and income row of the entity with the given key. When the
-- new name already belongs to another entity this is a merge. Repeating a rename
-- is safe: a second run finds nothing left under the old key and updates 0 rows.
CREATE FUNCTION "finance-app"."rename_entity"(
  "source_key" text,
  "new_name" text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_user_id uuid := (SELECT "auth"."uid"());
  current_household_id uuid;
  trimmed_name text := btrim(regexp_replace(coalesce("new_name", ''), '\s+', ' ', 'g'));
  target_key text;
  is_merge boolean;
  expense_updates integer;
  income_updates integer;
BEGIN
  SELECT "household_id" INTO current_household_id
  FROM "public"."Household_Member"
  WHERE "user_id" = current_user_id
  LIMIT 1;

  IF current_user_id IS NULL OR current_household_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Not authorized to rename entities.';
  END IF;

  IF trimmed_name = '' OR char_length(trimmed_name) > 100 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Enter a name of 1 to 100 characters.';
  END IF;

  IF "source_key" IS NULL OR "source_key" = '' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Choose an entity to rename.';
  END IF;

  target_key := "finance-app"."entity_key"(trimmed_name);

  is_merge := target_key <> "source_key" AND EXISTS (
    SELECT 1
    FROM "finance-app"."Budget_Hit"
    WHERE "household_id" = current_household_id
      AND "type" IN ('Expense', 'Income')
      AND "finance-app"."entity_key"("entity") = target_key
  );

  WITH updated AS (
    UPDATE "finance-app"."Budget_Hit"
    SET "entity" = trimmed_name
    WHERE "household_id" = current_household_id
      AND "type" IN ('Expense', 'Income')
      AND "finance-app"."entity_key"("entity") = "source_key"
    RETURNING "type"
  )
  SELECT
    count(*) FILTER (WHERE "type" = 'Expense'),
    count(*) FILTER (WHERE "type" = 'Income')
  INTO expense_updates, income_updates
  FROM updated;

  RETURN jsonb_build_object(
    'name', trimmed_name,
    -- A repeat of an earlier rename finds nothing left under the old key, so it is not a merge.
    'merged', is_merge AND (expense_updates + income_updates) > 0,
    'expensesUpdated', expense_updates,
    'incomeUpdated', income_updates
  );
END;
$$;

REVOKE ALL ON FUNCTION "finance-app"."entity_key"(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION "finance-app"."list_entities"() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION "finance-app"."rename_entity"(text, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION "finance-app"."entity_key"(text) TO authenticated;
GRANT EXECUTE ON FUNCTION "finance-app"."list_entities"() TO authenticated;
GRANT EXECUTE ON FUNCTION "finance-app"."rename_entity"(text, text) TO authenticated;
