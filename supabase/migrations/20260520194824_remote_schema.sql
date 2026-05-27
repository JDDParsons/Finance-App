


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "finance-app";


ALTER SCHEMA "finance-app" OWNER TO "postgres";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE SCHEMA IF NOT EXISTS "purchase-app";


ALTER SCHEMA "purchase-app" OWNER TO "postgres";


CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."budget_hit_set_income_account"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    IF (NEW.type = 'Income') THEN
      NEW.account_id := 'ea633d32-13ac-4f1e-b427-c972d123ad3a';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."budget_hit_set_income_account"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_transaction_categories"("transaction_ids" "uuid"[]) RETURNS TABLE("transaction_id" "uuid", "category_id" "uuid", "created_at" timestamp with time zone)
    LANGUAGE "sql" STABLE
    AS $$
  select transaction_id, category_id, created_at
  from "Transaction_Category"
  where transaction_id = any(transaction_ids)
  order by created_at desc;
$$;


ALTER FUNCTION "public"."get_transaction_categories"("transaction_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_household_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT household_id
  FROM "Household_Member"
  WHERE user_id = (SELECT auth.uid())
  LIMIT 1;
$$;


ALTER FUNCTION "public"."get_user_household_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_authorized_email"("email_to_check" "text") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
   SELECT EXISTS (
     SELECT 1 FROM auth.users WHERE email = email_to_check
   );
 $$;


ALTER FUNCTION "public"."is_authorized_email"("email_to_check" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "finance-app"."Account" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text",
    "institution" "text",
    "card_number" "text",
    "user_id" "uuid" DEFAULT "auth"."uid"(),
    "is_default_for_expenses" boolean DEFAULT false,
    "is_credit_card" boolean DEFAULT false,
    "is_default_for_income" boolean DEFAULT false,
    "household_id" "uuid"
);


ALTER TABLE "finance-app"."Account" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "finance-app"."Account_Value" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "baseline_amount" numeric,
    "cumulative_amount" numeric,
    "account_id" "uuid",
    "user_id" "uuid",
    "household_id" "uuid"
);


ALTER TABLE "finance-app"."Account_Value" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "finance-app"."Budget_Hit" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "amount" numeric,
    "user_id" "uuid",
    "budget_id" "uuid",
    "date" "date",
    "entity" "text",
    "notes" "text",
    "type" "text",
    "account_id" "uuid",
    "household_id" "uuid"
);


ALTER TABLE "finance-app"."Budget_Hit" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "finance-app"."Budget_Period" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "budget_id" "uuid" DEFAULT "gen_random_uuid"(),
    "date" "date",
    "amount" numeric,
    "user_id" "uuid",
    "household_id" "uuid"
);


ALTER TABLE "finance-app"."Budget_Period" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "finance-app"."Budgets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text",
    "amount" numeric,
    "user_id" "uuid",
    "household_id" "uuid",
    "color" "text",
    "icon" "text",
    "inactive" boolean DEFAULT false NOT NULL
);


ALTER TABLE "finance-app"."Budgets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "finance-app"."Category" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "label" "text"
);


ALTER TABLE "finance-app"."Category" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "finance-app"."Transaction" (
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "description" "text" NOT NULL,
    "transaction_date" "date" NOT NULL,
    "id" "uuid" NOT NULL,
    "group" "text",
    "group_id" numeric,
    "amount" numeric,
    "user_id" "uuid"
);


ALTER TABLE "finance-app"."Transaction" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "finance-app"."Transaction_Category" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "category_id" "uuid" DEFAULT "gen_random_uuid"(),
    "transaction_id" "uuid" DEFAULT "gen_random_uuid"(),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "finance-app"."Transaction_Category" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."Household" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."Household" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."Household_Member" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "household_id" "uuid",
    "user_id" "uuid"
);


ALTER TABLE "public"."Household_Member" OWNER TO "postgres";


ALTER TABLE "public"."Household_Member" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."Household_Member_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."Profile" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid" DEFAULT "gen_random_uuid"(),
    "first_name" "text",
    "last_name" "text",
    "avatar_link" "text",
    "household_id" "uuid",
    "email" "text"
);


ALTER TABLE "public"."Profile" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "purchase-app"."Item" (
    "id" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "product_name" "text" NOT NULL,
    "quantity" "text" DEFAULT ''::"text" NOT NULL,
    "unit" "text" DEFAULT 'each'::"text" NOT NULL,
    "price" "text" DEFAULT ''::"text" NOT NULL,
    "purchase_date" "date",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "purchase-app"."Item" OWNER TO "postgres";


ALTER TABLE ONLY "finance-app"."Account_Value"
    ADD CONSTRAINT "Account_Value_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "finance-app"."Account"
    ADD CONSTRAINT "Account_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "finance-app"."Budget_Hit"
    ADD CONSTRAINT "Budget_Hit_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "finance-app"."Budget_Period"
    ADD CONSTRAINT "Budget_Period_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "finance-app"."Budgets"
    ADD CONSTRAINT "Budgets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "finance-app"."Category"
    ADD CONSTRAINT "Categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "finance-app"."Transaction_Category"
    ADD CONSTRAINT "Transaction_Category_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "finance-app"."Transaction"
    ADD CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."Household_Member"
    ADD CONSTRAINT "Household_Member_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."Household"
    ADD CONSTRAINT "Household_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."Profile"
    ADD CONSTRAINT "Profile_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "purchase-app"."Item"
    ADD CONSTRAINT "Item_pkey" PRIMARY KEY ("id");



CREATE OR REPLACE TRIGGER "budget_hit_set_income_account_trg" BEFORE INSERT OR UPDATE ON "finance-app"."Budget_Hit" FOR EACH ROW EXECUTE FUNCTION "public"."budget_hit_set_income_account"();



ALTER TABLE ONLY "finance-app"."Account"
    ADD CONSTRAINT "Account_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "finance-app"."Budget_Hit"
    ADD CONSTRAINT "Budget_Hit_budget_id_fkey" FOREIGN KEY ("budget_id") REFERENCES "finance-app"."Budgets"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "finance-app"."Budget_Period"
    ADD CONSTRAINT "Budget_Period_budget_id_fkey" FOREIGN KEY ("budget_id") REFERENCES "finance-app"."Budgets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "finance-app"."Transaction_Category"
    ADD CONSTRAINT "Transaction_Category_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "finance-app"."Category"("id");



ALTER TABLE ONLY "finance-app"."Transaction_Category"
    ADD CONSTRAINT "Transaction_Category_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "finance-app"."Transaction"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."Household_Member"
    ADD CONSTRAINT "Household_Member_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "public"."Household"("id");



ALTER TABLE ONLY "public"."Household_Member"
    ADD CONSTRAINT "Household_Member_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."Profile"
    ADD CONSTRAINT "Profile_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "public"."Household"("id");



ALTER TABLE ONLY "public"."Profile"
    ADD CONSTRAINT "Profile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "purchase-app"."Item"
    ADD CONSTRAINT "Item_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE "finance-app"."Account" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "finance-app"."Account_Value" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "finance-app"."Budget_Hit" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "finance-app"."Budget_Period" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "finance-app"."Budgets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "finance-app"."Category" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Enable delete for users based on household_id" ON "finance-app"."Account" FOR DELETE USING (("household_id" = "public"."get_user_household_id"()));



CREATE POLICY "Enable delete for users based on household_id" ON "finance-app"."Budget_Hit" FOR DELETE TO "authenticated" USING (("household_id" = "public"."get_user_household_id"()));



CREATE POLICY "Enable delete for users based on household_id" ON "finance-app"."Budgets" FOR DELETE TO "authenticated" USING (("household_id" = "public"."get_user_household_id"()));



CREATE POLICY "Enable insert for authenticated users only" ON "finance-app"."Budgets" FOR INSERT TO "authenticated" WITH CHECK (((( SELECT "auth"."uid"() AS "uid") IS NOT NULL) AND ("user_id" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "Enable insert for users based on household_id" ON "finance-app"."Account" FOR INSERT TO "authenticated" WITH CHECK (("household_id" = "public"."get_user_household_id"()));



CREATE POLICY "Enable insert for users based on household_id" ON "finance-app"."Account_Value" FOR INSERT WITH CHECK (("household_id" = "public"."get_user_household_id"()));



CREATE POLICY "Enable insert for users based on household_id" ON "finance-app"."Budget_Hit" FOR INSERT TO "authenticated" WITH CHECK (("household_id" = "public"."get_user_household_id"()));



CREATE POLICY "Enable insert for users based on household_id" ON "finance-app"."Budget_Period" FOR INSERT TO "authenticated" WITH CHECK (("household_id" = "public"."get_user_household_id"()));



CREATE POLICY "Enable select for users based on household_id" ON "finance-app"."Account_Value" FOR SELECT TO "authenticated" USING (("household_id" = "public"."get_user_household_id"()));



CREATE POLICY "Enable select for users based on household_id" ON "finance-app"."Budget_Hit" FOR SELECT TO "authenticated" USING (("household_id" = "public"."get_user_household_id"()));



CREATE POLICY "Enable select for users based on household_id" ON "finance-app"."Budget_Period" FOR SELECT TO "authenticated" USING (("household_id" = "public"."get_user_household_id"()));



CREATE POLICY "Enable select for users based on household_id" ON "finance-app"."Budgets" FOR SELECT TO "authenticated" USING (("household_id" = "public"."get_user_household_id"()));



CREATE POLICY "Enable update for users based on household_id" ON "finance-app"."Account" FOR UPDATE TO "authenticated" USING (("household_id" = "public"."get_user_household_id"()));



CREATE POLICY "Enable update for users based on household_id" ON "finance-app"."Account_Value" FOR UPDATE USING (("household_id" = "public"."get_user_household_id"()));



CREATE POLICY "Enable update for users based on household_id" ON "finance-app"."Budget_Hit" FOR UPDATE TO "authenticated" USING (("household_id" = "public"."get_user_household_id"()));



CREATE POLICY "Enable update for users based on household_id" ON "finance-app"."Budget_Period" FOR UPDATE TO "authenticated" USING (("household_id" = "public"."get_user_household_id"()));



CREATE POLICY "Enable update for users based on household_id" ON "finance-app"."Budgets" FOR UPDATE TO "authenticated" USING (("household_id" = "public"."get_user_household_id"()));



CREATE POLICY "Enable users to view their own data only" ON "finance-app"."Account" FOR SELECT TO "authenticated" USING (("household_id" = "public"."get_user_household_id"()));



ALTER TABLE "finance-app"."Transaction" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "finance-app"."Transaction_Category" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "read categories" ON "finance-app"."Category" FOR SELECT USING (true);



CREATE POLICY "temp user manages tx categories" ON "finance-app"."Transaction_Category" USING ((EXISTS ( SELECT 1
   FROM "finance-app"."Transaction"
  WHERE (("Transaction"."id" = "Transaction_Category"."transaction_id") AND ("Transaction"."user_id" = "auth"."uid"())))));



CREATE POLICY "temp user owns transactions" ON "finance-app"."Transaction" FOR SELECT TO "authenticated" USING (((( SELECT "auth"."uid"() AS "uid") IS NOT NULL) AND ("user_id" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "temp user owns transactions - insert" ON "finance-app"."Transaction" FOR INSERT TO "authenticated" WITH CHECK (((( SELECT "auth"."uid"() AS "uid") IS NOT NULL) AND ("user_id" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "temp user owns transactions - update" ON "finance-app"."Transaction" FOR UPDATE TO "authenticated" USING (((( SELECT "auth"."uid"() AS "uid") IS NOT NULL) AND ("user_id" = ( SELECT "auth"."uid"() AS "uid")))) WITH CHECK (((( SELECT "auth"."uid"() AS "uid") IS NOT NULL) AND ("user_id" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "Enable read access for all users" ON "public"."Profile" FOR SELECT USING (true);



CREATE POLICY "Enable users to view their own data only" ON "public"."Household_Member" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



ALTER TABLE "public"."Household" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."Household_Member" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."Profile" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "purchase-app"."Item" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Users can manage their own items" ON "purchase-app"."Item" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "finance-app" TO "anon";
GRANT USAGE ON SCHEMA "finance-app" TO "authenticated";
GRANT USAGE ON SCHEMA "finance-app" TO "service_role";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































REVOKE ALL ON FUNCTION "public"."budget_hit_set_income_account"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."budget_hit_set_income_account"() TO "anon";
GRANT ALL ON FUNCTION "public"."budget_hit_set_income_account"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."budget_hit_set_income_account"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_transaction_categories"("transaction_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."get_transaction_categories"("transaction_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_transaction_categories"("transaction_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_household_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_household_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_household_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_authorized_email"("email_to_check" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."is_authorized_email"("email_to_check" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_authorized_email"("email_to_check" "text") TO "service_role";


















GRANT ALL ON TABLE "finance-app"."Account" TO "anon";
GRANT ALL ON TABLE "finance-app"."Account" TO "authenticated";
GRANT ALL ON TABLE "finance-app"."Account" TO "service_role";



GRANT ALL ON TABLE "finance-app"."Account_Value" TO "anon";
GRANT ALL ON TABLE "finance-app"."Account_Value" TO "authenticated";
GRANT ALL ON TABLE "finance-app"."Account_Value" TO "service_role";



GRANT ALL ON TABLE "finance-app"."Budget_Hit" TO "anon";
GRANT ALL ON TABLE "finance-app"."Budget_Hit" TO "authenticated";
GRANT ALL ON TABLE "finance-app"."Budget_Hit" TO "service_role";



GRANT ALL ON TABLE "finance-app"."Budget_Period" TO "anon";
GRANT ALL ON TABLE "finance-app"."Budget_Period" TO "authenticated";
GRANT ALL ON TABLE "finance-app"."Budget_Period" TO "service_role";



GRANT ALL ON TABLE "finance-app"."Budgets" TO "anon";
GRANT ALL ON TABLE "finance-app"."Budgets" TO "authenticated";
GRANT ALL ON TABLE "finance-app"."Budgets" TO "service_role";



GRANT ALL ON TABLE "finance-app"."Category" TO "anon";
GRANT ALL ON TABLE "finance-app"."Category" TO "authenticated";
GRANT ALL ON TABLE "finance-app"."Category" TO "service_role";



GRANT ALL ON TABLE "finance-app"."Transaction" TO "anon";
GRANT ALL ON TABLE "finance-app"."Transaction" TO "authenticated";
GRANT ALL ON TABLE "finance-app"."Transaction" TO "service_role";



GRANT ALL ON TABLE "finance-app"."Transaction_Category" TO "anon";
GRANT ALL ON TABLE "finance-app"."Transaction_Category" TO "authenticated";
GRANT ALL ON TABLE "finance-app"."Transaction_Category" TO "service_role";



GRANT ALL ON TABLE "public"."Household" TO "anon";
GRANT ALL ON TABLE "public"."Household" TO "authenticated";
GRANT ALL ON TABLE "public"."Household" TO "service_role";



GRANT ALL ON TABLE "public"."Household_Member" TO "anon";
GRANT ALL ON TABLE "public"."Household_Member" TO "authenticated";
GRANT ALL ON TABLE "public"."Household_Member" TO "service_role";



GRANT ALL ON SEQUENCE "public"."Household_Member_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."Household_Member_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."Household_Member_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."Profile" TO "anon";
GRANT ALL ON TABLE "public"."Profile" TO "authenticated";
GRANT ALL ON TABLE "public"."Profile" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































drop extension if exists "pg_net";
