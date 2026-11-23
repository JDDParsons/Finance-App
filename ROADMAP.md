# Budgify roadmap

Planned features in priority order, highest first. Started 2026-11-18. This is a planning document, not a commitment: scope, order and status can change. Update it whenever a feature starts, ships or is dropped.

"Today" notes describe what the code does as of the date above, so each feature starts from what already exists. "Open questions" are decisions that are still the owner's to make; nothing here has been decided unless it says so.

## Summary

| # | Feature | Status | Builds on |
| --- | --- | --- | --- |
| 1 | Wishlist (savings impact planner) | Design agreed, not started | Savings totals (income minus expenses) |
| 2 | Tags (replaces secondary budgets) | Design agreed, not started | Expenses (budget hits), offline outbox |
| 3 | Recurring transactions | Not started | Idempotent creates, Vercel cron |
| 4 | Activity history | Not started (needs definition) | `user_id` on budget hits |
| 5 | User/household management | Not started | `Profile.household_id`, invite-only login |
| 6 | Offline mode | Phase 1 shipped and tested on a device (offline is a dependency of items 1 to 3) | Offline cache and outbox |
| 7 | Remove CSV file upload | Planned removal | See README footprint |
| 8 | Linked bank accounts | Not started | Accounts |
| 9 | Language model integration for dynamic reports | Not started | `/api/bootstrap` data |

Status values: Not started, In progress, Shipped, Dropped.

## 1. Wishlist (savings impact planner)

**Decided:** this replaces the original "savings goals" idea. Budgify is meant to be lightweight and to build the habit of watching inflow and outflow, not to account for every dollar, so the wishlist does not track progress toward a goal or where money goes. It records things the user is considering buying or saving for and shows what each one means relative to the savings they already have, to support a better decision.

**Today:** `/savings` shows trailing 12-month savings, defined as income minus expenses per month (`utils/savingsTotals.ts`, `savings` store, included in `/api/bootstrap`). Account balances exist in the app but are not used, so nothing here depends on them. The wishlist reuses these monthly totals.

**Design decisions**
- Name: Wishlist, with a gift icon. It replaces the existing Savings page and takes its place in the navigation, so the mobile bottom nav stays at four tabs (Home, Budgets, Cashflow, Wishlist) and the desktop side nav swaps Savings for Wishlist. Removing Upload (item 7) also frees a side-nav slot.
- A wishlist item is small: name, amount, optional target date, a color, an icon, a status (considering, bought, dropped), and a visibility (household or personal). No contributions and no linking to accounts or budgets.
- Color and icon work like they do for budgets. Reuse the existing pickers (`app/components/budgets/ColorPicker.vue`, `ChooseIcon.vue`) and icon handling (`useBudgetIcon`) rather than building new ones.
- All figures are calculated from completed months only; the current, incomplete month is excluded.
- The target date is informational only. It does not change any calculation; figures always compare the item's cost with savings as they stand.
- Marking an item bought offers to record it as an expense, using the normal expense creation flow with the item's name and amount prefilled and the budget set to "No budget" (an expense with no budget, which the app already supports and flags with its uncategorized-expenses alert). The user can decline, and nothing is recorded automatically.
- Wishlist works offline, including creating, editing and deleting items. Items are included in `/api/bootstrap` and the offline snapshot, and the calculations run from cached data. This adds new kinds of queued operations to the offline outbox, which today only queues expense, income and transfer creates (see item 6).
- Year-end projection uses the average savings of the last 3 completed months, with a fixed window for now. A selectable window (3, 6 or 12 months) was discussed and is deferred.
- The trailing monthly savings chart and totals move from the Savings page to the Wishlist page, where they give context for each item's figures. The `/savings` route is removed and replaced by `/wishlist`, with no redirect for now.
- Each item is either shared with the household or personal, chosen by the user when creating it and changeable later. Shared items are visible to every household member; personal items are visible only to their creator, including in the combined "if I buy all" view. Figures for every item, personal or shared, are measured against household savings. Any household member can edit or delete a shared item; only the creator can edit or delete a personal one. Switching an item between shared and personal asks for confirmation, because other members would lose or gain sight of it.

**What each item shows**
- Its cost as a percentage of last month's savings and of the last 3 months' combined savings (for example, an $800 console as 70% of last month's savings and 20% of the last 3 months').
- How many months of typical savings it represents.
- Projected year-end savings with the purchase versus without it.
- For large items, the same figures read as "about N months at your recent pace".
- A combined view for several selected items ("if I buy all three").

**Edge cases to handle**
- If last month's (or the 3-month) savings were zero or negative, a percentage is meaningless. Show plain wording such as "more than you saved last month" instead of a number.
- Every projection should state its basis, for example "based on your average over the last 3 months", since it depends on how consistently the user tracks.
- Fewer than 3 months of data: say how many months the figure is based on.

**Proposed data model (not yet built):** one household-scoped table in the `finance-app` schema (for example `Wishlist_Item`: id, household_id, name, amount, target_date, color, icon, status, visibility, created_by, created_at) with RLS added by a forward migration. Household items follow the existing household policies (`get_user_household_id()`); personal items additionally require `created_by = auth.uid()` for every operation, so other members can neither read nor change them. Wishlist data is added to `/api/bootstrap` and the offline snapshot (see the offline decision above). Reads and writes go through the usual path: composable in `app/composables/api/`, server route, helper in `server/utils/supabase/`. Calculations can live in a pure `utils/` module with tests, like `savingsTotals.ts`.

**Open questions**
- Replaying queued edits and deletes needs a conflict rule (for example, an item deleted by someone else while the change was queued). Decide that when offline editing is built (see item 6).

## 2. Tags (replaces "secondary budgets")

**Decided:** the original idea, secondary budgets, is replaced by tags. The problem to solve: one expense can belong to more than one thing conceptually, for example a restaurant meal on a trip (restaurants budget or travel?) or dinner party groceries (groceries budget or a dinner party?), and the user wants to see its impact from each angle.

**Why tags and not a second budget:** a budget is an envelope. Each expense belongs to exactly one, so budget totals add up. An expense counted toward two budgets would be double-counted and the numbers would stop reconciling. A tag is a lens: an expense can carry any number of tags and tags never change budget math, savings or the Wishlist figures. This is the usual pattern in budgeting apps that pair one primary category with tags.

**Today:** every expense has one budget or none ("No budget"). Nothing else groups expenses. The names `BudgetTagPicker` and `DateTagPicker` refer to pill-style selectors in the UI and are unrelated to this feature.

**Design decisions**
- Expenses only for now. Income and transfers cannot be tagged.
- An expense can have any number of tags, or none. Tagging is optional and skippable when entering an expense.
- Tags are created on the spot by typing a new name in the expense form, and can be added or removed later when editing any expense (one expense at a time; no bulk tagging).
- Names are normalized: lowercase, prefixed with `#`, and with spaces removed, so "Dinner Party" becomes `#dinnerparty`. Typing the `#` yourself does not double it. Two names that normalize to the same value are the same tag. Special characters (punctuation, symbols, emoji) are allowed. The only things blocked are whitespace (removed), control and zero-width characters (invisible, so they would create look-alike duplicates), and names longer than 20 characters, not counting the `#`. Names are Unicode-normalized before comparing, so look-alike forms of the same text count as one tag. Because names can contain symbols, they must be URL-encoded wherever they appear in routes or queries.
- A tag has a name and a color. No icon and no target amount. The color is assigned automatically from the existing budget color palette when the tag is created, so nothing extra is asked while typing a name in the expense form.
- A tag's totals are all-time (a trip or a party does not reset monthly), with a way to view them by month. The tag view shows its total, a breakdown by budget, and a timeline of its expenses. It shows only the tag's own numbers, with no comparison to household spending.
- Tags live in a "Tags" tab beside the budget list on the Budgets page. The mobile bottom nav stays at four tabs. There is no tag filter on the cashflow table for now.
- Tags are always shared with the household, and any member can edit or delete one.
- Tags can be deleted, with a confirmation. Deleting a tag removes it from its expenses and never deletes the expenses. There is no archiving.
- Tags work fully offline, in line with the Wishlist decision: a tag can be created offline, and an expense still waiting to sync can carry it.
- Tags do not appear in the Home charts or the Wishlist figures, so no existing number changes.

**Proposed data model (not yet built):** a household-scoped `Tag` table in the `finance-app` schema (id, household_id, name stored in normalized form and unique per household, color, created_by, created_at) and a join table linking budget hits to tags, both with household RLS matching the other tables, added by a forward migration. Deleting a tag removes its join rows. Tag data is added to `/api/bootstrap` and the offline snapshot.

**Offline notes:** tags need client-generated ids so a queued expense can reference a tag created offline, and the outbox must run the tag create before the expense that uses it. Creating a tag should be safe to repeat (create-or-get by normalized name), in the same spirit as the existing `operationId` idempotency for expenses.

**Open questions**
- Renaming a tag to a name that already exists: reject with a message (the simple default), or merge the two tags?

## 3. Recurring transactions

**Today:** expenses, income and transfers are created one at a time. Creates accept a client-supplied `operationId` and are idempotent (migration `idempotent_budget_hit_creates`), which is a useful property for any automated creation. Vercel already runs one scheduled job (`/api/cron/keep-alive`, daily).

**Open questions**
- Which types recur: expenses, income, transfers, or all three?
- Schedule model: fixed day of month, every N weeks, custom?
- Are occurrences created automatically, or proposed for the user to confirm?
- Where does generation run (a scheduled job, or on app load), and how are missed runs handled?
- What happens to past occurrences when a recurring rule is edited or deleted?
- Automated creation by a scheduled job needs a server credential that can act for a household; follow the Supabase rules in `AGENTS.md` (security-definer function, scoped to the household, minimal grants) instead of widening use of the service-role key.

## 4. Activity history

**Today:** budget hits record the `user_id` of whoever created them, and the app shows creator names and avatars. There is a per-budget spending history chart, but that is spending over time, not an audit trail. No record of who edited or deleted something was found in what was reviewed.

**Needs definition first.** Decide what "activity" covers: creations only, or edits and deletions too; which entities (transactions, budgets, accounts, transfers); and who sees it. If edits and deletions are included, decide whether to record them in the database (a log table written by the database functions that already perform atomic writes) or elsewhere.

## 5. User and household management

**Today:** each user has a `Profile` with a `household_id`, and all data is scoped to the household. Login is invite-only email code: the server checks the `is_authorized_email` function before sending a code, and never creates accounts. The profile page appears to be a placeholder. There is no in-app way to invite someone, remove someone or edit profile details.

**Open questions**
- How are members invited, and who may invite (any member, or an owner role)?
- Are there roles or permissions, or are all members equal?
- What happens to a removed member's past entries?
- Can a user belong to more than one household?
- Profile editing scope: name, avatar, email?

Any change to who is authorized touches the login check and the RLS policies, so it needs a migration and a review of both.

## 6. Offline mode

**Priority use case:** adding expenses far outweighs every other action in the app. Anything that threatens "open the app and add an expense with no signal" outranks the rest of this section. Wishlist (item 1) and Tags (item 2) are committed to working fully offline, and Recurring transactions (item 3) will create transactions through the same path, so generalizing the offline engine once is cheaper than retrofitting each feature.

### How it works today

- **Reads:** one snapshot per month is stored in IndexedDB (`budgify-offline`). On launch the app shows the cached snapshot immediately, then refreshes from `/api/bootstrap`. Refreshes also run every 5 minutes, when the app returns to the foreground, and when the network returns.
- **Writes:** only new expenses, income and transfers can be queued. Each gets a client-generated `operationId`, an optimistic row, and an idempotent replay. `apiFetch` rejects every other write while offline.
- **Replay:** the queue is sent oldest first, one entry at a time. A success removes the entry and swaps the temporary row for the server's row. A network failure stops replay and leaves the rest queued. A server rejection marks the entry failed with its error, visible with Retry and Discard. Replaying is safe to repeat because the server recognizes an `operationId` it has already saved.
- **When replay runs:** only while the app is open in the foreground: on launch, on return to the foreground, when the browser reports it is online again, and on the 5-minute refresh. Nothing replays while the app is closed or the phone is asleep. There is no background-sync code and no custom service worker; the service worker only caches the app so it can start without a network.
- **Login while offline (Phase 1 fix):** the app saves the signed-in user id on the device and uses it to open the app and to queue entries when the access token has expired and the server cannot be reached. A token refresh is attempted only when online, and a session check is capped at a few seconds.
- **Background sync is discarded.** The owner uses an iPhone, and the browser Background Sync feature does not work on iOS Safari (it works in Chrome and Edge only). Sync happens when the app is opened.

### Known issues (found by reading the code; issue 1 confirmed on the owner's phone)

1. **The app did not open offline once the login token expired.** Supabase access tokens last about an hour. When `getSession()` finds an expired token it tries a network refresh; offline, that fails and it returns "no session", so the app treated the user as signed out and showed the login page after a long wait. Confirmed 2026-11-21 on the owner's phone: airplane mode gives a long wait and then the login screen, and turning airplane mode off makes the app work again without signing in. **Fixed in Phase 1.**
2. **Queueing an expense offline failed once the token had expired.** `createOrQueueOffline` re-read the session to get the user id and threw "Not authenticated" instead of queueing. **Fixed in Phase 1.**
3. **A 401 during replay wiped the queue.** `syncOutbox` and `revalidate` cleared the whole offline cache, including the outbox. **Fixed in Phase 1.**
4. **Only months already opened are available offline.** Any other month fails with "This month has not been saved for offline use yet."
5. **`getSupabase()` created a new Supabase client on every call.** Several clients sharing one login could try to refresh the same token at once; because refresh tokens rotate, a race could sign the user out unexpectedly. **Fixed in Phase 1.**
6. **Icons did not render offline.** The icon module used the `server` provider, which fetches each SVG from `/api/_nuxt_icon` at runtime; that fails offline and is never cached. **Fixed:** `icon.clientBundle` (with `scan: true` plus the two account icons from `utils/accountAppearance.ts`, which the scan does not reach) embeds the icons in the precached client bundle. A new icon name must be a literal string in `app/`, or be added to `icon.clientBundle.icons` in `nuxt.config.ts`.
7. **Cashflow showed an offline error after adding a transaction offline.** `CreateModal` refetches the month after saving; offline that request failed and set `store.error`, which the cashflow lists render instead of the transactions. **Fixed:** `fetchAll` in `app/stores/finance.ts` returns early when offline and the store is already loaded, so cached and queued rows stay on screen.

### Decisions

**Agreed**
- Target the use case, not a full local database: expenses, income and transfers (create, edit, delete), plus wishlist items and tags, work offline. Budgets and accounts stay online-only, because their writes run atomic database functions with uniqueness rules and month-owned periods that are conflict-prone to replay. A full local copy of the database with a sync engine would be a rewrite and is not justified by the use case.
- Wishlist and tags work fully offline, including create, edit and delete (see items 1 and 2).
- Background sync is discarded; sync happens when the app is opened.
- Session expiry: unsynced changes are never discarded automatically. A rejected or missing login clears the in-memory data and the local login, keeps the offline cache and queue, and shows "Please sign in again"; the entries replay after the same user signs in. Signing out with unsynced changes warns first (already the case). Implemented in Phase 1.

**Proposed defaults (not yet confirmed; confirm before building)**
- **Editing or deleting something not yet synced:** change or remove the queued entry itself instead of queueing a separate update or delete.
- **Conflicts:** last write wins. A delete beats an edit. An edit to something deleted elsewhere is dropped and shown in the failed list. Deleting something already deleted counts as success.
- **Months available offline:** pre-cache the current month and the previous two while online, plus any month opened. Earlier months stay online-only.

### Phase 1 fix for the launch and queueing bugs

Separate "who is the user" (needed to open the app and queue entries) from "is there a valid token" (needed only to talk to the server):
- One shared session helper (`resolveSession()`), used by the middleware, the login page, `useAppData`, the profile store and the offline queue. If a session exists, use it. If there is no session and no error, the user is signed out. If there is no session and the error is a network failure (or the check times out, or the browser is offline), treat the user as signed in but offline, using the saved user id. Any other error means the session is invalid.
- Save the user id on the device whenever a valid session is seen, and clear it on sign-out. It is only used to find the cached data and to tag queued entries; it is not a credential, and the server still enforces access.
- Queueing uses the saved user id, so it works with an expired token. Replay asks for a token when online, and the library refreshes it automatically.
- Offline with a saved user, the login page redirects to the home page.
- Do not wait on the network. When the browser reports it is offline, skip the refresh attempt. Otherwise cap session resolution at a few seconds and fall back to the saved user id.
- The decision logic is a plain function (`utils/authSession.ts`) with unit tests (`tests/auth-session.test.mjs`).
- One shared Supabase client instead of a new one per call.
- On a 401 or missing login while syncing: stop polling, clear the in-memory data and the local login, keep the offline cache and queue, and open the login page with a "Please sign in again" message.
- Rejected: lengthening the token lifetime in Supabase. It would only make the bug rarer and leaves a stolen token valid longer.

### TODO

**Phase 0: confirm the problem**
- [x] Confirm what the user sees when the app will not load offline (done 2026-11-21, see known issue 1).
- [x] Note which phone is used: an iPhone, so background sync is discarded.

**Phase 1: fix launch and queueing**
- [x] Pure session-decision function with unit tests.
- [x] Shared session helper and saved user id; cleared on sign-out.
- [x] Skip the token refresh when offline and cap session resolution with a short timeout.
- [x] Replace direct `getSession()` calls in the auth middleware, the login page, `useAppData.load`, the profile store, `createOrQueueOffline` and `getApiToken`.
- [x] One shared Supabase client.
- [x] Redirect the login page to the home page when offline with a saved user.
- [x] On a 401 during replay: keep the queue and prompt to sign in again. The outbox is no longer cleared.
- [x] Warn before sign-out when there are unsynced entries (already in place).
- [x] Manual test on a real device (the owner's iPhone): passed.
- [x] Correct the docs that say the app opens offline (README, `AGENTS.md`, and the middleware comment).

**Phase 2: generalize the queue (moderate)**
- [ ] Change the outbox entry from "create" to an operation: entity, action (create, edit, delete), target id, payload.
- [ ] Generate ids on the device for everything created offline, so a later queued entry can refer to it.
- [ ] Merge edits and deletes of a not-yet-synced entry into the queued create instead of queueing separate entries.
- [ ] Define replay ordering and dependencies (for example a tag must be created before an expense that uses it).
- [ ] Make the server accept repeated edits and deletes safely (deleting a missing record succeeds; edits are idempotent).
- [ ] Apply the agreed conflict rules; show dropped entries in the failed list.
- [ ] Allow edit and delete of expenses, income and transfers while offline: lift the `apiFetch` offline block for these, update the stores optimistically, extend `WRITE_ACTIONS`.
- [ ] Pre-cache the current month and previous two in the background when online.
- [ ] Keep the "N changes waiting to sync" indicator prominent and make sync-on-open prompt.
- [ ] Unit tests for the queue: merging, ordering, conflicts, retry and discard.

**Phase 3: Wishlist and Tags offline (with items 1 and 2)**
- [ ] Add wishlist items and tags to `/api/bootstrap` and the offline snapshot. Bump the snapshot version and decide how old caches are handled (the simple option discards them and refetches when online).
- [ ] Queue wishlist and tag create, edit and delete through the generalized queue.

**Later and optional**
- [ ] Revisit budgets and accounts offline only if a real need appears.

**Open questions**
- Confirm the proposed defaults above, or change them.
- Storage: how many months of data per device is acceptable once more months are pre-cached?
- Test coverage today is unit-level only (queue and cache helpers, session decisions). Real-device testing of the PWA offline behavior is still needed after each phase.

## 7. Remove CSV file upload

**Status:** planned removal. The footprint is listed in the README under "Statement upload (legacy, scheduled for removal)".

**Steps to plan**
1. Decide whether existing `Transaction` data is kept or dropped (a one-way decision).
2. Remove pages, components, API composables, server routes, server data helpers and parsers listed in the README, plus the nav entry in `SideNav.vue`.
3. Add a forward migration for the related tables and the `get_transaction_categories` function. Do not edit old migrations. The migration deploys to production when merged to `main`, so read it carefully.
4. Remove dependencies used only by this feature (check `papaparse`, `@types/papaparse`, `csv-parse`, `uuid`) and the `papaparse` entry in the Nitro config.
5. Remove or update affected tests and docs (README, `AGENTS.md`, `TECH_STACK.md`).
6. Run `npm test` and `npm run build`.

This work is independent of the other features and can be done at any time. It also shrinks the code to maintain before larger features land.

## 8. Linked bank accounts

**Today:** accounts are manual. Each has a baseline value and recorded values over time, an appearance (color and icon), and transfers between accounts. Some bank logos are bundled for display.

**Open questions**
- Which data provider, and does it cover the banks used (Canadian coverage)? What are its cost and terms?
- What is synced: balances only, or transactions too? If transactions, how do they map to budgets, and how are duplicates with manually entered ones avoided?
- Where do provider credentials and access tokens live, and how are they protected? This needs a security review before building.
- What does the app show when a link breaks or needs re-authorization?
- Interaction with offline mode and with the planned removal of CSV upload (item 7), which currently is the only bulk import path.

## 9. Language model integration for dynamic reports

**Today:** no integration. `/api/bootstrap` already assembles a month of budgets, spending, income, transfers and savings in one response, which may be a convenient input.

**Open questions**
- What is a "dynamic report": a written monthly summary, answers to questions asked in plain language, or generated charts?
- Privacy: financial data would leave the app. What is sent, to which provider, with what retention, and is it opt-in?
- Where the provider key is held (server only, never in the browser) and how requests are authorized and rate limited.
- How are generated numbers checked against the real data so reports can't state wrong figures?
- Cost per report and how often it is generated.

## Cross-cutting notes

- Any schema change follows the migration rules in `AGENTS.md`. Merging to `main` applies migrations to production with no approval step.
- Features 3, 4 and 5 all benefit from deciding up front how household scoping and "who did this" are represented.
- Features 3, 6 and 8 all create or change transactions; agree on one idempotency approach (the existing `operationId`) before building more than one of them.
