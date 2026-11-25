-- Tags for expenses.
--
-- A tag is a lens on an expense, not a budget: an expense can carry up to 3 tags and
-- tags never change budget, savings or Wishlist numbers. Tags belong to the household,
-- are created by name while saving an expense, and are managed (renamed, recolored,
-- deleted) from Settings. Only expenses can be tagged.
--
-- Rows are written only through the functions below, which run as the owner after
-- resolving the caller's household. The tables themselves are read-only to users.

-- ---------------------------------------------------------------------------
-- Names. "Dinner Party", "#dinnerparty" and "DINNERPARTY" are the same tag: Unicode
-- normalized, whitespace removed, a leading # removed, lower case, then one # added.
-- Control and zero-width characters are rejected because they are invisible and would
-- create look-alike duplicates. At most 20 characters, not counting the #.
-- ---------------------------------------------------------------------------
CREATE FUNCTION "finance-app"."tag_name"("raw" text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
DECLARE
  cleaned text;
BEGIN
  cleaned := regexp_replace(normalize(coalesce("raw", ''), NFKC), '\s', '', 'g');
  cleaned := regexp_replace(cleaned, '^#+', '');

  IF cleaned ~ '[[:cntrl:]\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF\u00AD]' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Tag names cannot contain hidden characters.';
  END IF;

  cleaned := lower(cleaned);

  IF cleaned = '' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Enter a tag name.';
  END IF;

  IF char_length(cleaned) > 20 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Tag names can be at most 20 characters.';
  END IF;

  RETURN '#' || cleaned;
END;
$$;

-- The colors a new tag is given (the budget color palette), least used first.
CREATE FUNCTION "finance-app"."tag_palette"()
RETURNS text[]
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT ARRAY['#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6'];
$$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
CREATE TABLE "finance-app"."Tag" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "household_id" uuid NOT NULL,
  "name" text NOT NULL,
  "color" text NOT NULL,
  "created_by" uuid DEFAULT "auth"."uid"(),
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "Tag_name_valid" CHECK (
    "name" ~ '^#[^[:space:]]+$' AND char_length("name") BETWEEN 2 AND 21 AND "name" = lower("name")
  ),
  CONSTRAINT "Tag_color_valid" CHECK ("color" ~ '^#[0-9a-fA-F]{6}$'),
  CONSTRAINT "Tag_household_name_key" UNIQUE ("household_id", "name"),
  CONSTRAINT "Tag_id_household_key" UNIQUE ("id", "household_id")
);

ALTER TABLE "finance-app"."Budget_Hit"
  ADD CONSTRAINT "Budget_Hit_id_household_key" UNIQUE ("id", "household_id");

-- The composite keys keep an expense and its tag in the same household. Deleting an
-- expense or a tag removes the links, never the other side.
CREATE TABLE "finance-app"."Budget_Hit_Tag" (
  "budget_hit_id" uuid NOT NULL,
  "tag_id" uuid NOT NULL,
  "household_id" uuid NOT NULL,
  PRIMARY KEY ("budget_hit_id", "tag_id"),
  CONSTRAINT "Budget_Hit_Tag_hit_fkey" FOREIGN KEY ("budget_hit_id", "household_id")
    REFERENCES "finance-app"."Budget_Hit" ("id", "household_id") ON DELETE CASCADE,
  CONSTRAINT "Budget_Hit_Tag_tag_fkey" FOREIGN KEY ("tag_id", "household_id")
    REFERENCES "finance-app"."Tag" ("id", "household_id") ON DELETE CASCADE
);

CREATE INDEX "Budget_Hit_Tag_tag_idx" ON "finance-app"."Budget_Hit_Tag" ("tag_id");

-- Only expenses can be tagged, and an expense has at most 3 tags.
CREATE FUNCTION "finance-app"."validate_budget_hit_tag"()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM "finance-app"."Budget_Hit"
    WHERE "id" = NEW."budget_hit_id" AND "type" = 'Expense'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Only expenses can be tagged.';
  END IF;

  IF (
    SELECT count(*)
    FROM "finance-app"."Budget_Hit_Tag"
    WHERE "budget_hit_id" = NEW."budget_hit_id"
  ) >= 3 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'An expense can have at most 3 tags.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "budget_hit_tag_validate_trg"
BEFORE INSERT ON "finance-app"."Budget_Hit_Tag"
FOR EACH ROW EXECUTE FUNCTION "finance-app"."validate_budget_hit_tag"();

-- ---------------------------------------------------------------------------
-- Row level security: the household can read its tags. Writes go through functions.
-- ---------------------------------------------------------------------------
ALTER TABLE "finance-app"."Tag" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "finance-app"."Budget_Hit_Tag" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable select for users based on household_id" ON "finance-app"."Tag"
  FOR SELECT TO "authenticated"
  USING (("household_id" = "public"."get_user_household_id"()));

CREATE POLICY "Enable select for users based on household_id" ON "finance-app"."Budget_Hit_Tag"
  FOR SELECT TO "authenticated"
  USING (("household_id" = "public"."get_user_household_id"()));

REVOKE ALL ON TABLE "finance-app"."Tag" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE "finance-app"."Budget_Hit_Tag" FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE "finance-app"."Tag" TO authenticated;
GRANT SELECT ON TABLE "finance-app"."Budget_Hit_Tag" TO authenticated;
GRANT ALL ON TABLE "finance-app"."Tag" TO service_role;
GRANT ALL ON TABLE "finance-app"."Budget_Hit_Tag" TO service_role;

-- ---------------------------------------------------------------------------
-- Functions
-- ---------------------------------------------------------------------------

-- The tags on one expense as [{id, name, color}], by name. Internal helper.
CREATE FUNCTION "finance-app"."budget_hit_tag_details"("hit_id" uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT coalesce(
    jsonb_agg(jsonb_build_object('id', t."id", 'name', t."name", 'color', t."color") ORDER BY t."name"),
    '[]'::jsonb
  )
  FROM "finance-app"."Budget_Hit_Tag" bht
  JOIN "finance-app"."Tag" t ON t."id" = bht."tag_id" AND t."household_id" = bht."household_id"
  WHERE bht."budget_hit_id" = "hit_id";
$$;

-- Makes the given names the full set of tags on an expense. Names that do not exist yet
-- are created with the least used palette color. Repeating a call changes nothing.
CREATE FUNCTION "finance-app"."set_budget_hit_tags"("hit_id" uuid, "tag_names" text[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_user_id uuid := (SELECT "auth"."uid"());
  current_household_id uuid;
  names text[];
  one_name text;
BEGIN
  SELECT "household_id" INTO current_household_id
  FROM "public"."Household_Member"
  WHERE "user_id" = current_user_id
  LIMIT 1;

  IF current_user_id IS NULL OR current_household_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Not authorized to tag expenses.';
  END IF;

  PERFORM 1
  FROM "finance-app"."Budget_Hit"
  WHERE "id" = "hit_id"
    AND "household_id" = current_household_id
    AND "type" = 'Expense'
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'This expense no longer exists.';
  END IF;

  SELECT coalesce(array_agg(DISTINCT "finance-app"."tag_name"(raw_name)), '{}')
  INTO names
  FROM unnest(coalesce("tag_names", '{}')) AS raw_name;

  IF cardinality(names) > 3 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'An expense can have at most 3 tags.';
  END IF;

  FOREACH one_name IN ARRAY names LOOP
    INSERT INTO "finance-app"."Tag" ("household_id", "name", "color")
    SELECT
      current_household_id,
      one_name,
      (
        SELECT palette."color"
        FROM unnest("finance-app"."tag_palette"()) WITH ORDINALITY AS palette("color", "position")
        ORDER BY (
          SELECT count(*)
          FROM "finance-app"."Tag" existing
          WHERE existing."household_id" = current_household_id
            AND lower(existing."color") = palette."color"
        ), palette."position"
        LIMIT 1
      )
    ON CONFLICT ("household_id", "name") DO NOTHING;
  END LOOP;

  DELETE FROM "finance-app"."Budget_Hit_Tag"
  WHERE "budget_hit_id" = "hit_id"
    AND "tag_id" NOT IN (
      SELECT "id" FROM "finance-app"."Tag"
      WHERE "household_id" = current_household_id AND "name" = ANY(names)
    );

  INSERT INTO "finance-app"."Budget_Hit_Tag" ("budget_hit_id", "tag_id", "household_id")
  SELECT "hit_id", "id", current_household_id
  FROM "finance-app"."Tag"
  WHERE "household_id" = current_household_id AND "name" = ANY(names)
  ON CONFLICT DO NOTHING;

  RETURN "finance-app"."budget_hit_tag_details"("hit_id");
END;
$$;

-- Creates an expense and its tags in one step, so a failure leaves neither behind. A
-- repeat of an earlier create (same operation id) returns the saved expense and leaves
-- its tags alone, since they may have been edited since.
CREATE FUNCTION "finance-app"."create_expense_with_tags"(
  "operation_id" uuid,
  "transaction_amount" numeric,
  "transaction_date" date,
  "transaction_entity" text,
  "transaction_notes" text,
  "source_account_id" uuid,
  "target_budget_id" uuid,
  "tag_names" text[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_user_id uuid := (SELECT "auth"."uid"());
  current_household_id uuid;
  already_saved boolean;
  saved_hit jsonb;
BEGIN
  SELECT "household_id" INTO current_household_id
  FROM "public"."Household_Member"
  WHERE "user_id" = current_user_id
  LIMIT 1;

  IF current_user_id IS NULL OR current_household_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Not authorized to create this transaction.';
  END IF;

  already_saved := EXISTS (
    SELECT 1
    FROM "finance-app"."Budget_Hit"
    WHERE "household_id" = current_household_id
      AND "client_operation_id" = "operation_id"
  );

  saved_hit := "finance-app"."create_budget_hit_idempotent"(
    "operation_id", 'Expense', "transaction_amount", "transaction_date", "transaction_entity",
    "transaction_notes", "source_account_id", NULL, "target_budget_id"
  );

  IF NOT already_saved AND cardinality(coalesce("tag_names", '{}')) > 0 THEN
    PERFORM "finance-app"."set_budget_hit_tags"(("saved_hit"->>'id')::uuid, "tag_names");
  END IF;

  RETURN saved_hit || jsonb_build_object(
    'tag_details', "finance-app"."budget_hit_tag_details"(("saved_hit"->>'id')::uuid)
  );
END;
$$;

-- Settings: every tag with how many expenses carry it.
CREATE FUNCTION "finance-app"."list_tags"()
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
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Not authorized to view tags.';
  END IF;

  RETURN coalesce((
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', t."id",
        'name', t."name",
        'color', t."color",
        'expenseCount', (
          SELECT count(*) FROM "finance-app"."Budget_Hit_Tag" bht WHERE bht."tag_id" = t."id"
        )
      )
      ORDER BY t."name"
    )
    FROM "finance-app"."Tag" t
    WHERE t."household_id" = current_household_id
  ), '[]'::jsonb);
END;
$$;

-- Settings: rename a tag. A name that already belongs to another tag is rejected.
CREATE FUNCTION "finance-app"."rename_tag"("target_tag_id" uuid, "new_name" text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_user_id uuid := (SELECT "auth"."uid"());
  current_household_id uuid;
  new_tag_name text := "finance-app"."tag_name"("new_name");
  renamed jsonb;
BEGIN
  SELECT "household_id" INTO current_household_id
  FROM "public"."Household_Member"
  WHERE "user_id" = current_user_id
  LIMIT 1;

  IF current_user_id IS NULL OR current_household_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Not authorized to rename tags.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "finance-app"."Tag"
    WHERE "household_id" = current_household_id
      AND "name" = new_tag_name
      AND "id" <> "target_tag_id"
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'A tag with that name already exists.';
  END IF;

  UPDATE "finance-app"."Tag"
  SET "name" = new_tag_name
  WHERE "id" = "target_tag_id" AND "household_id" = current_household_id
  RETURNING jsonb_build_object('id', "id", 'name', "name", 'color', "color") INTO renamed;

  IF renamed IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'This tag no longer exists.';
  END IF;

  RETURN renamed;
END;
$$;

CREATE FUNCTION "finance-app"."recolor_tag"("target_tag_id" uuid, "new_color" text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_user_id uuid := (SELECT "auth"."uid"());
  current_household_id uuid;
  recolored jsonb;
BEGIN
  SELECT "household_id" INTO current_household_id
  FROM "public"."Household_Member"
  WHERE "user_id" = current_user_id
  LIMIT 1;

  IF current_user_id IS NULL OR current_household_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Not authorized to change tags.';
  END IF;

  IF "new_color" IS NULL OR "new_color" !~ '^#[0-9a-fA-F]{6}$' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Choose a valid color.';
  END IF;

  UPDATE "finance-app"."Tag"
  SET "color" = lower("new_color")
  WHERE "id" = "target_tag_id" AND "household_id" = current_household_id
  RETURNING jsonb_build_object('id', "id", 'name', "name", 'color', "color") INTO recolored;

  IF recolored IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'This tag no longer exists.';
  END IF;

  RETURN recolored;
END;
$$;

-- Removes the tag from its expenses. The expenses stay. Deleting a missing tag succeeds,
-- so a repeated delete is safe.
CREATE FUNCTION "finance-app"."delete_tag"("target_tag_id" uuid)
RETURNS void
LANGUAGE plpgsql
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
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Not authorized to delete tags.';
  END IF;

  DELETE FROM "finance-app"."Tag"
  WHERE "id" = "target_tag_id" AND "household_id" = current_household_id;
END;
$$;

REVOKE ALL ON FUNCTION "finance-app"."tag_name"(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION "finance-app"."tag_palette"() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION "finance-app"."validate_budget_hit_tag"() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION "finance-app"."budget_hit_tag_details"(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION "finance-app"."set_budget_hit_tags"(uuid, text[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION "finance-app"."create_expense_with_tags"(uuid, numeric, date, text, text, uuid, uuid, text[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION "finance-app"."list_tags"() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION "finance-app"."rename_tag"(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION "finance-app"."recolor_tag"(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION "finance-app"."delete_tag"(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION "finance-app"."tag_name"(text) TO authenticated;
GRANT EXECUTE ON FUNCTION "finance-app"."tag_palette"() TO authenticated;
GRANT EXECUTE ON FUNCTION "finance-app"."set_budget_hit_tags"(uuid, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION "finance-app"."create_expense_with_tags"(uuid, numeric, date, text, text, uuid, uuid, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION "finance-app"."list_tags"() TO authenticated;
GRANT EXECUTE ON FUNCTION "finance-app"."rename_tag"(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION "finance-app"."recolor_tag"(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION "finance-app"."delete_tag"(uuid) TO authenticated;
