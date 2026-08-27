# Repository agent instructions

## Supabase workflow

- Use `npx supabase` for Supabase CLI commands in this repository.
- Treat the linked Supabase project as production unless the user says otherwise.
- Prefer versioned migrations for schema, RLS policy, trigger, view, and SQL function changes.
- Put schema changes in `supabase/migrations/` and keep them committed to git.
- Avoid ad hoc SQL for persistent schema changes unless the user explicitly asks for a one-off manual change.
- Before proposing or applying destructive database changes, explain the impact plainly.
- Keep `supabase/.temp/` untracked; it is local CLI state, not project source.

## Migration guidance

- Use migrations for:
  - creating or altering tables
  - enabling or changing RLS
  - creating or replacing functions
  - triggers, indexes, views, and grants
- Name migrations descriptively so intent is obvious from git history.
- When changing existing database behavior, prefer a new forward migration over editing old migration history.

## Application workflow

- This is a Nuxt 4 single-page app with `srcDir: 'app'` and `ssr: false`.
- The deployed app uses `app.baseURL = '/Finance-App/'`; keep route and asset changes compatible with that base path.
- Follow existing Nuxt and TypeScript patterns already present in the repo.
- Keep application data access behind the existing Nuxt server API. UI components and Pinia stores should call `app/composables/api/`, which call `server/api/` routes; routes delegate Supabase work to `server/utils/supabase/`.
- Keep feature work aligned to the existing domain split: auth, home, budgets, cashflow, savings, accounts, and upload.
- Use `npm run build` as the repository validation command after code changes.

## Architecture overview

- `app/pages/` holds route-level screens. The main authenticated areas are:
  - `/home` for summary dashboards and charts
  - `/budgets` and `/budgets/[id]` for budget management
  - `/cashflow` for income and expense entry/history
  - `/accounts` for account management
  - `/savings` for trailing savings summaries
  - `/upload` for statement upload, transaction review, and reporting
- `app/app.vue` is the shell. It loads accounts on mount and switches between `SideNav` on desktop and `BottomNav` on mobile.
- `app/middleware/01.auth.global.ts` is the global auth gate. Unauthenticated users stay on `/`, authenticated users are redirected to `/home`, and the middleware initializes the profile store so `household_id` is cached early.
- Pinia stores in `app/stores/` are the primary state layer:
  - `profile` resolves the current user's `Profile` row and caches `household_id`
  - `accounts` manages accounts plus latest `Account_Value` data
  - `finance` is the central budgeting/cashflow store and owns the selected month
  - `savings` derives trailing savings history from `finance`
- Reuse stores for shared state instead of duplicating fetch logic inside pages.

## Supabase data-access architecture

- Supabase access is organized by domain under `app/composables/supabase/`:
  - `client.ts` creates the browser client and caches `household_id`
  - `auth.ts` handles magic-link / OTP login and sign-out
  - `budgets.ts` manages `Budgets` and `Budget_Period`
  - `hits.ts` manages `Budget_Hit` for both expenses and income
  - `accounts.ts` manages `Account` and `Account_Value`
  - `upload.ts` manages `Transaction`, `Transaction_Category`, `Category`, and `Transaction_Groups`
- Prefer adding or updating logic in these domain composables instead of calling Supabase directly from many components.
- Existing Supabase table names are capitalized (for example `Profile`, `Budgets`, `Budget_Hit`, `Account`, `Transaction`); preserve the current naming conventions in queries and migrations unless intentionally changing schema.
- The app depends on `household_id` scoping. When creating new rows in app-managed tables, follow the existing pattern of resolving the current session user and household before insert.

### Persistence decision rule

- Use direct Supabase table queries in `server/utils/supabase/` for reads and single-table CRUD operations.
- Use a versioned PostgreSQL function called through `rpc()` when a workflow writes multiple tables and must succeed or fail atomically, or when check-then-write behavior has a concurrency risk.
- Use a database trigger only for an invariant that must hold regardless of which trusted entry point writes the row. Keep user-initiated workflows explicit rather than hiding them in triggers.
- Keep authorization inside security-definer functions by resolving `auth.uid()` to the caller's household and scoping every affected row to it. Use an empty `search_path`, fully qualified identifiers, minimal grants, and explicit errors.
- Keep Nuxt route contracts and UI orchestration in TypeScript; database functions should own transactional data changes, not presentation or external-service logic.

## Data behavior notes

- `Budget_Hit` stores both expenses and income; `type` distinguishes `Expense` from `Income`.
- Budget month views are period-based. `Budget_Period` rows are auto-created for the current month when missing, and non-current months only show budgets with an existing period.
- The upload flow parses CSVs in the browser with Papa Parse, normalizes them through `utils/parse.ts`, then upserts into `Transaction`.
- Transaction categorization uses the `get_transaction_categories` RPC plus the `Transaction_Category` table; preserve that flow when adjusting upload/reporting features.
