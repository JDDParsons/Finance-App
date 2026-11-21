# Repository agent instructions

## Supabase workflow

- Use `npx supabase` for Supabase CLI commands in this repository.
- Treat the linked Supabase project as production unless the user says otherwise.
- Prefer versioned migrations for schema, RLS policy, trigger, view, and SQL function changes.
- Put schema changes in `supabase/migrations/` and keep them committed to git.
- Avoid ad hoc SQL for persistent schema changes unless the user explicitly asks for a one-off manual change.
- Before proposing or applying destructive database changes, explain the impact plainly.
- Keep `supabase/.temp/` untracked; it is local CLI state, not project source.
- Merging to `main` runs `supabase db push` against production (GitHub Action, no approval step). PRs to `main` get a `--dry-run` check.

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
- The app defaults to `app.baseURL = '/'`; `NUXT_APP_BASE_URL` can override it for subpath deployments. Keep route, asset, and PWA URLs derived from the configured base path. Vercel redirects legacy `/Finance-App` URLs to root URLs.
- Follow existing Nuxt and TypeScript patterns already present in the repo.
- Keep application data access behind the existing Nuxt server API. UI components and Pinia stores should call `app/composables/api/`, which call `server/api/` routes; routes delegate Supabase work to `server/utils/supabase/`.
- Keep feature work aligned to the existing domain split: auth, home, budgets, cashflow, savings, and accounts.
- Use `npm run build` and `npm test` as the validation commands after code changes.
- Local development: `.\run-app.ps1` (see README).

## Deprecated: statement upload

The CSV statement upload feature (`/upload`, `/upload/transactions`) and everything that exists only for it is **scheduled for removal**. Do not extend, fix, refactor, or add tests for it, and do not use it as a pattern for new work. If a change would touch it, prefer leaving it alone. The README section "Statement upload (legacy, scheduled for removal)" lists its full footprint. When removal is requested, delete that footprint and add a forward migration for its tables rather than editing old migrations.

## Architecture overview

- `app/pages/` holds route-level screens. The main authenticated areas are:
  - `/home` for summary dashboards and charts
  - `/budgets` and `/budgets/[id]` for budget management
  - `/cashflow` for income, expense, and transfer entry and history
  - `/accounts` for account management
  - `/savings` for trailing savings summaries
  - `/upload` (deprecated, see above)
- `app/app.vue` is the shell. It switches between `SideNav` on desktop and `BottomNav` on mobile. `SideNav` links to the deprecated upload page; `BottomNav` does not.
- `app/middleware/01.auth.global.ts` is the global auth gate. It resolves the session with `resolveSession()` (`app/composables/supabase/session.ts`): signed-out users stay on `/`, signed-in users are redirected from `/` to `/home`. A user who is signed in but cannot refresh an expired token because the device is offline still counts as signed in (see Offline support). It does not load data.
- Authentication is invite-only email OTP. `POST /api/auth/send-code` checks the `is_authorized_email` RPC with the service-role key before sending a code (`shouldCreateUser: false`). The browser verifies the code with `supabase.auth.verifyOtp` (`app/composables/supabase/auth.ts`).

### State and data loading

- Pinia stores in `app/stores/` are the primary state layer:
  - `profile` holds the current user's `Profile` row and `household_id`
  - `accounts` manages accounts plus latest `Account_Value` data
  - `finance` is the central budgeting/cashflow store and owns the selected month
  - `savings` holds trailing savings history
  - `transactionCreateModal` and `transactionView` hold UI state
- `app/composables/useAppData.ts` orchestrates loading. It calls `GET /api/bootstrap?year=&month=`, which returns profile, accounts, budgets, income, expenses (budget hits), transfers, available months and savings in one response, and hydrates all stores from it. It also handles refresh/polling, online/offline state, and the offline outbox. The set of write actions it registers is listed in `WRITE_ACTIONS`.
- Reuse stores for shared state instead of duplicating fetch logic inside pages.

### Data access layers

- Browser: `app/composables/supabase/` is limited to the shared Supabase client (`client.ts`, a single instance, used for session and auth only), session helpers (`session.ts`) and auth helpers (`auth.ts`). Do not query data tables from the browser, and use `resolveSession()` instead of calling `getSession()` directly.
- Client API: `app/composables/api/use*Api.ts` call `apiFetch` (`app/composables/useApiToken.ts`), which attaches the user's access token as a Bearer header. `apiFetch` rejects requests while offline. `getApiToken` waits at most 8 seconds for a token and throws `SessionUnavailableError` (a connection problem, so creates are queued) or `NotAuthenticatedError` (the user must sign in).
- Server routes: `server/api/<domain>/...`. Each route calls `requireAuth(event)` (`server/utils/supabase/auth.ts`), which validates the token and returns a user-scoped Supabase client (anon key plus the caller's JWT, so RLS applies). Routes then call domain helpers in `server/utils/supabase/` (`budgets.ts`, `hits.ts`, `accounts.ts`, `profile.ts`, `transactions.ts`, plus `budget-errors.ts`). The service-role key is reserved for the login-code and keep-alive routes; don't use it elsewhere without a clear need.
- `server/middleware/01.api-cache-control.ts` sets `Cache-Control: private, no-store` on all `/api/` responses.
- Table names are capitalized (`Profile`, `Budgets`, `Budget_Period`, `Budget_Hit`, `Account`, `Account_Value`); preserve existing naming in queries and migrations unless intentionally changing the schema. Server helpers query the `finance-app` schema (for example `transactions.ts` uses `supabase.schema('finance-app')`).
- The app depends on `household_id` scoping. When creating rows, resolve the caller's household with `resolveHouseholdId` as existing routes do.

### Offline support

- `app/utils/offlineFinanceCache.client.ts` stores month snapshots, preferences and an outbox in IndexedDB (`budgify-offline`).
- `app/utils/offlineCreateQueue.client.ts` (`createOrQueueOffline`) sends expense, income and transfer creates to `/api/hits`, `/api/income` and `/api/transfers` with a client-generated `operationId`. On a network failure it queues the operation and returns an optimistic row; queued items replay only while the app is open and online: on launch, on return to the foreground, when the browser reports it is online, and on the 5-minute refresh. Nothing replays while the app is closed, and background sync is not used.
- Idempotency: server routes validate `operationId` (`server/utils/offline-operation.ts`) and the `idempotent_budget_hit_creates` migration makes replays safe. Keep creates idempotent when changing these paths.
- Signed-in state while offline: `resolveSession()` (decision logic in `utils/authSession.ts`) saves the user id on the device (`localStorage`, key `budgify:user-id`) whenever a valid session is seen. If Supabase cannot refresh an expired token because the network is unavailable, the session check takes longer than 4 seconds, or the browser is offline, the user counts as signed in as the saved user. The app then opens from the cache and entries can be queued. The saved id is not a credential and the server still enforces access. It is cleared on sign-out.
- Only creates are queued. Edits and deletes require a connection.
- The offline cache is cleared on sign-out. Cached data is tied to a user id and is rejected if it belongs to a different user.
- A rejected or missing login while syncing (a 401, or `NotAuthenticatedError`) clears only the in-memory data and the local login. The offline cache and outbox are kept, and queued entries replay after the same user signs in. Do not clear the outbox in this case.

### Persistence decision rule

- Use direct Supabase table queries in `server/utils/supabase/` for reads and single-table CRUD operations.
- Use a versioned PostgreSQL function called through `rpc()` when a workflow writes multiple tables and must succeed or fail atomically, or when check-then-write behavior has a concurrency risk.
- Use a database trigger only for an invariant that must hold regardless of which trusted entry point writes the row. Keep user-initiated workflows explicit rather than hiding them in triggers.
- Keep authorization inside security-definer functions by resolving `auth.uid()` to the caller's household and scoping every affected row to it. Use an empty `search_path`, fully qualified identifiers, minimal grants, and explicit errors.
- Keep Nuxt route contracts and UI orchestration in TypeScript; database functions should own transactional data changes, not presentation or external-service logic.

## Data behavior notes

- `Budget_Hit` stores both expenses and income; `type` distinguishes `Expense` from `Income`.
- Budget month views are period-based. Budget periods are owned by a month (`Budget_Period`). A month only shows budgets that have a period for it; previous-month budgets can be copied forward (`copy-previous`, `copy-preview`). Treat the migrations from `month_owned_budget_periods` onward as the source of truth for the exact rules.
- Income budgets and expense budgets share the budget model and are distinguished by type.
- Transfers between accounts are first-class records (`/api/transfers`) and can be created, edited and deleted.

## Testing

- `npm test` runs `node --test --experimental-strip-types tests/*.test.mjs`. Tests cover utilities in `utils/` and `app/utils/`, store/composable helpers, UI logic and the contents of migration SQL. Add a test alongside any new utility or migration behavior.
- There are no component, API-route, or database/RLS tests; do not assume those paths are covered.
