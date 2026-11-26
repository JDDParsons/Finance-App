# Budgify roadmap

Planned features in priority order, highest first. Started 2026-11-18. This is a planning document, not a commitment: scope, order and status can change. Update it whenever a feature starts, ships or is dropped.

"Today" notes describe what the code does as of the date above, so each feature starts from what already exists. "Open questions" are decisions that are still the owner's to make; nothing here has been decided unless it says so.

## Summary

| # | Feature | Status | Builds on |
| --- | --- | --- | --- |
| 1 | Wishlist (savings impact planner) | Design agreed, not started | Savings totals (income minus expenses) |
| 2 | Tags (replaces secondary budgets) | Built: data layer, entering/editing tags on expenses, and tag management in Settings; device check pending | Expenses (budget hits), offline outbox |
| 3 | Recurring transactions | Not started | Idempotent creates, Vercel cron |
| 4 | Activity history | Not started (needs definition) | `user_id` on budget hits |
| 5 | User/household management | Not started | `Profile.household_id`, invite-only login |
| 6 | Offline mode | Phases 1 and 2 shipped and tested on a device; Phase 4 (sync status chip) built, device check pending; Phase 3 not started (offline is a dependency of items 1 to 3) | Offline cache and outbox |
| 7 | Remove CSV file upload | Planned removal | See README footprint |
| 8 | Linked bank accounts | Not started | Accounts |
| 9 | Language model integration for dynamic reports | Not started | `/api/bootstrap` data |
| 10 | Settings page (manage entities and tags) | Settings, accounts move and entity rename and merge built, device check pending; tag management built (item 2), device check pending | Entities on budget hits, tags (item 2) |
| 11 | Custom reports | Design agreed (layout to plan), not started | Tags (item 2), settings (item 10) |

Status values: Not started, In progress, Shipped, Dropped.

**Agreed build order for items 10, 2 and 11 (decided 2026-11-23):** 1) the Settings page with entity management (item 10), 2) Tags, managed from Settings (item 2), 3) Custom reports (item 11). Each step ships on its own. The item numbers are not the build order here.

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

**Data model (built in `supabase/migrations/20261126120000_add_tags.sql`):** one household-scoped table in the `finance-app` schema (for example `Wishlist_Item`: id, household_id, name, amount, target_date, color, icon, status, visibility, created_by, created_at) with RLS added by a forward migration. Household items follow the existing household policies (`get_user_household_id()`); personal items additionally require `created_by = auth.uid()` for every operation, so other members can neither read nor change them. Wishlist data is added to `/api/bootstrap` and the offline snapshot (see the offline decision above). Reads and writes go through the usual path: composable in `app/composables/api/`, server route, helper in `server/utils/supabase/`. Calculations can live in a pure `utils/` module with tests, like `savingsTotals.ts`.

**Open questions**
- Replaying queued edits and deletes needs a conflict rule (for example, an item deleted by someone else while the change was queued). Decide that when offline editing is built (see item 6).

## 2. Tags (replaces "secondary budgets")

**Decided:** the original idea, secondary budgets, is replaced by tags. The problem to solve: one expense can belong to more than one thing conceptually, for example a restaurant meal on a trip (restaurants budget or travel?) or dinner party groceries (groceries budget or a dinner party?), and the user wants to see its impact from each angle.

**Why tags and not a second budget:** a budget is an envelope. Each expense belongs to exactly one, so budget totals add up. An expense counted toward two budgets would be double-counted and the numbers would stop reconciling. A tag is a lens: an expense can carry any number of tags and tags never change budget math, savings or the Wishlist figures. This is the usual pattern in budgeting apps that pair one primary category with tags.

**Today:** every expense has one budget or none ("No budget"). Nothing else groups expenses. The names `BudgetTagPicker` and `DateTagPicker` refer to pill-style selectors in the UI and are unrelated to this feature.

**Design decisions**
- Expenses only for now. Income and transfers cannot be tagged.
- An expense can have up to 3 tags, or none (decided 2026-11-25: more would not fit on the card). Tagging is optional and skippable when entering an expense.
- Tags are created on the spot by typing a new name in the expense form, and can be added or removed later when editing any expense (one expense at a time; no bulk tagging).
- Names are normalized: lowercase, prefixed with `#`, and with spaces removed, so "Dinner Party" becomes `#dinnerparty`. Typing the `#` yourself does not double it. Two names that normalize to the same value are the same tag. Special characters (punctuation, symbols, emoji) are allowed. The only things blocked are whitespace (removed), control and zero-width characters (invisible, so they would create look-alike duplicates), and names longer than 20 characters, not counting the `#`. Names are Unicode-normalized before comparing, so look-alike forms of the same text count as one tag. Because names can contain symbols, they must be URL-encoded wherever they appear in routes or queries.
- A tag has a name and a color. No icon and no target amount. The color is assigned automatically from the existing budget color palette when the tag is created, so nothing extra is asked while typing a name in the expense form.
- There is no separate tag view or Tags tab on the Budgets page. Tag totals, breakdowns and timelines come from Custom reports (item 11), where a tag is one of the filters. Tags are created while entering an expense, and are renamed, recolored and deleted from the Settings page (item 10). The mobile bottom nav stays at four tabs. There is no tag filter on the cashflow table for now.
- Tags are always shared with the household, and any member can edit or delete one.
- Tags can be deleted, with a confirmation. Deleting a tag removes it from its expenses and never deletes the expenses. There is no archiving.
- Tags work fully offline, in line with the Wishlist decision: a tag can be created offline, and an expense still waiting to sync can carry it.
- Tags do not appear in the Home charts or the Wishlist figures, so no existing number changes.

**Proposed data model (not yet built):** a household-scoped `Tag` table in the `finance-app` schema (id, household_id, name stored in normalized form and unique per household, color, created_by, created_at) and a join table linking budget hits to tags, both with household RLS matching the other tables, added by a forward migration. Deleting a tag removes its join rows. Tag data is added to `/api/bootstrap` and the offline snapshot.

**Offline notes:** tags need client-generated ids so a queued expense can reference a tag created offline, and the outbox must run the tag create before the expense that uses it. Creating a tag should be safe to repeat (create-or-get by normalized name), in the same spirit as the existing `operationId` idempotency for expenses.

**Open questions**
- Renaming a tag to a name that already exists: reject with a message (the simple default), or merge the two tags?

**Decided 2026-11-25:** the open question on renaming is settled: renaming to a name that already exists is rejected with a message (no merge). Instead of client-generated tag ids, a queued expense carries tag names and the server creates or finds the tags in the same step that saves the expense (`create_expense_with_tags`, `set_budget_hit_tags`), so no tag has to be queued before an expense. A tag made offline shows with a provisional color until it syncs. Expense rows carry `tags`, the list of tag names; a new tag takes the palette color the fewest tags use. Rename, recolor, delete and list functions exist in the database for the Settings page.

**Build slices:** 1) data layer (done), 2) tags on the create flow and the expense card (done), 3) tag management in Settings (done: /settings/tags lists tags with expense counts; rename, recolor, delete with confirmation; online-only, syncs the queue first).

**Build order:** Tags come after the Settings page (item 10), which hosts tag management, and before Custom reports (item 11), which is where tags are used to answer questions.

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

- **Reads:** one snapshot per month is stored in IndexedDB (`budgify-offline`). On launch the app shows the cached snapshot immediately, then refreshes from `/api/bootstrap`. Refreshes also run every 5 minutes, when the app returns to the foreground, and when the network returns. After a refresh, while online, the app also saves the current month and the two before it in the background (a month saved in the last 30 minutes is not fetched again). These extra months never change which month the app opens on.
- **Writes:** expenses, income and transfers can be created, edited and deleted offline. Each queued entry is an operation: entity, action (create, edit, delete), target id and payload. A create gets a client-generated `operationId` that doubles as the id of its optimistic row. Edits and deletes carry the id of the existing row. `apiFetch` still rejects every other write while offline (budgets, accounts and so on).
- **Merging:** a row that already has a queued entry is changed in the queue instead of being sent to the server. Editing something that has not synced yet changes the queued create; a second edit replaces the first; deleting something that has not synced removes the queued create and queues nothing; deleting a row with a queued edit drops the edit and queues one delete.
- **Replay:** the queue is sent oldest first (at the same time, creates before edits before deletes), one entry at a time. A success removes the entry and swaps the temporary row for the server's row. A network failure stops replay and leaves the rest queued. A server rejection marks the entry failed with its error, visible with Retry and Discard; discarding a failed edit or delete reloads the data so the row shows what is saved. Replaying is safe to repeat: creates are recognized by their `operationId`, an edit just writes the same values again, and deleting a row that is already gone succeeds.
- **Conflicts:** last write wins and a delete beats an edit. An edit of a row that was deleted elsewhere gets a 404 from the server, is dropped, and appears in the failed list with "This item was deleted elsewhere, so the change was dropped."
- **When replay runs:** only while the app is open in the foreground: on launch, on return to the foreground, when the browser reports it is online again, and on the 5-minute refresh. Nothing replays while the app is closed or the phone is asleep. There is no background-sync code and no custom service worker; the service worker only caches the app so it can start without a network.
- **Login while offline (Phase 1 fix):** the app saves the signed-in user id on the device and uses it to open the app and to queue entries when the access token has expired and the server cannot be reached. A token refresh is attempted only when online, and a session check is capped at a few seconds.
- **Background sync is discarded.** The owner uses an iPhone, and the browser Background Sync feature does not work on iOS Safari (it works in Chrome and Edge only). Sync happens when the app is opened.

### Known issues (found by reading the code; issue 1 confirmed on the owner's phone)

1. **The app did not open offline once the login token expired.** Supabase access tokens last about an hour. When `getSession()` finds an expired token it tries a network refresh; offline, that fails and it returns "no session", so the app treated the user as signed out and showed the login page after a long wait. Confirmed 2026-11-21 on the owner's phone: airplane mode gives a long wait and then the login screen, and turning airplane mode off makes the app work again without signing in. **Fixed in Phase 1.**
2. **Queueing an expense offline failed once the token had expired.** `createOrQueueOffline` re-read the session to get the user id and threw "Not authenticated" instead of queueing. **Fixed in Phase 1.**
3. **A 401 during replay wiped the queue.** `syncOutbox` and `revalidate` cleared the whole offline cache, including the outbox. **Fixed in Phase 1.**
4. **Only months already opened were available offline.** Any other month failed with "This month has not been saved for offline use yet." **Fixed in Phase 2:** the current month and the two before it are saved in the background while online. Earlier months you have not opened still fail with that message.
5. **`getSupabase()` created a new Supabase client on every call.** Several clients sharing one login could try to refresh the same token at once; because refresh tokens rotate, a race could sign the user out unexpectedly. **Fixed in Phase 1.**
6. **Icons did not render offline.** The icon module used the `server` provider, which fetches each SVG from `/api/_nuxt_icon` at runtime; that fails offline and is never cached. **Fixed:** `icon.clientBundle` (with `scan: true` plus the two account icons from `utils/accountAppearance.ts`, which the scan does not reach) embeds the icons in the precached client bundle. A new icon name must be a literal string in `app/`, or be added to `icon.clientBundle.icons` in `nuxt.config.ts`.
7. **Cashflow showed an offline error after adding a transaction offline.** `CreateModal` refetches the month after saving; offline that request failed and set `store.error`, which the cashflow lists render instead of the transactions. **Fixed:** `fetchAll` in `app/stores/finance.ts` returns early when offline and the store is already loaded, so cached and queued rows stay on screen.
8. **Rows waiting to sync could not be edited or deleted.** The lists refused with "This offline expense must sync before it can be edited" (and the same for income and transfers), a Phase 1 guard left over from when only creates could be queued. **Fixed:** the guards are gone, because the queue already merges an edit or delete into the queued entry for that row. Editing a failed entry puts it back in the queue to be retried.

### Decisions

**Agreed**
- Target the use case, not a full local database: expenses, income and transfers (create, edit, delete), plus wishlist items and tags, work offline. Budgets and accounts stay online-only, because their writes run atomic database functions with uniqueness rules and month-owned periods that are conflict-prone to replay. A full local copy of the database with a sync engine would be a rewrite and is not justified by the use case.
- Wishlist and tags work fully offline, including create, edit and delete (see items 1 and 2).
- Background sync is discarded; sync happens when the app is opened.
- Session expiry: unsynced changes are never discarded automatically. A rejected or missing login clears the in-memory data and the local login, keeps the offline cache and queue, and shows "Please sign in again"; the entries replay after the same user signs in. Signing out with unsynced changes warns first (already the case). Implemented in Phase 1.

**Agreed for Phase 2 (confirmed 2026-11-22, implemented)**
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
- [x] Change the outbox entry from "create" to an operation: entity, action (create, edit, delete), target id, payload. Entries saved by the old version are read as creates (`normalizeOperation`), so nothing queued before the update is lost.
- [x] Generate ids on the device for everything created offline, so a later queued entry can refer to it. Expenses, income and transfers already use a client-generated `operationId` as the id of the optimistic row. Wishlist items and tags will do the same in Phase 3.
- [x] Merge edits and deletes of a not-yet-synced entry into the queued create instead of queueing separate entries (`planEdit` and `planDelete` in `utils/offlineQueue.ts`).
- [x] Define replay ordering and dependencies: oldest first, then create, edit, delete. Expenses, income and transfers do not depend on each other (budgets and accounts are online-only), so no cross-entity dependency is needed yet. Phase 3 must queue a tag before the expense that uses it, which this order already gives.
- [x] Make the server accept repeated edits and deletes safely: deleting a missing record already succeeds, edits are idempotent, and an edit of a missing record now answers 404 (`throwIfRowMissing`).
- [x] Apply the agreed conflict rules; show dropped entries in the failed list (`classifyReplayError`).
- [x] Allow edit and delete of expenses, income and transfers while offline: the API layer queues them (`editOrQueueOffline`, `deleteOrQueueOffline`), the stores update optimistically, and queued changes are re-applied after every refresh and when a cached month is opened.
- [x] Pre-cache the current month and previous two in the background when online.
- [x] Keep the "N changes waiting to sync" indicator prominent and make sync-on-open prompt. The existing banner counts every queued change, and replay still runs on launch, on return to the foreground and when the network returns.
- [x] Unit tests for the queue: merging, ordering, conflicts, retry and discard (`tests/offline-queue.test.mjs`). The IndexedDB and replay code itself is covered only by source-level checks.
- [x] Manual test on a real device (the owner's iPhone): passed.
**Phase 3: Wishlist and Tags offline (with items 1 and 2)**
- [ ] Add wishlist items and tags to `/api/bootstrap` and the offline snapshot. Bump the snapshot version and decide how old caches are handled (the simple option discards them and refetches when online).
- [ ] Queue wishlist and tag create, edit and delete through the generalized queue.

**Phase 4: visible sync status (small, independent of Phase 3)**
Decided 2026-11-23. Make the offline, syncing and synced states visible without opening anything.
- [x] Add a shared composable that turns the existing state in `useAppData` (`isOffline`, `syncing`, `pendingSyncCount`, `failedSyncCount`) into one status, so the chip, the profile page and the top banner cannot disagree. Offline: grey. Online with changes waiting or syncing: blue. Online and nothing waiting: green. Failed changes: amber, a fourth state so green never hides something that needs action.
- [x] In the top right of the app, put a small colored chip (`UChip`, a plain dot with no icon) on the profile avatar in `AppHeader.vue`, with an accessible label and tooltip that state the status in words.
- [x] On the profile page, show the status icon and text below the user's email. Icons: offline `fa7-regular:cloud`, syncing `fa7-solid:arrows-rotate` (spinning, and still when the user prefers reduced motion), synced `fa7-regular:circle-check`, needs attention `fa7-solid:triangle-exclamation`. The Retry and Discard actions for failed changes can sit next to the "needs attention" text.
- [x] Keep the existing banner for details, and move it below the header. Today it is fixed at the top edge with the same stacking level (`z-50`) as the sticky header, which comes later in the page, so the header very likely covers it (found by reading the code on 2026-11-23, not yet confirmed on screen). Offset it by the header height (`--ui-header-height`, plus the safe-area inset) so it is always visible, including on a phone.
- [x] Add `@iconify-json/fa7-regular` and `@iconify-json/fa7-solid`, list both in `icon.serverBundle.collections`, and list the four icon names in `icon.clientBundle.icons` (a computed name from a state map is not found by the scan), so they render offline.
- [x] Unit test the status decision (`tests/sync-status.test.mjs`).
- [ ] Check the colors, icons and banner position on a real device, including offline and with a failed change.

**Later and optional**
- [ ] Revisit budgets and accounts offline only if a real need appears.

**Open questions**
- Confirm the proposed defaults above, or change them.
- Storage: three months are pre-cached today. Is that enough, and how much data per device is acceptable if it grows?
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
- Overlap with Custom reports (item 11): a structured filter report could be the dependable base. A language model could turn a plain-language question into those same filters, so the figures come from the database and not from the model.

## 10. Settings page (manage entities and tags)

**Decided:** a Settings page is added, first for managing entities (the payer or payee on an expense or income record), then for managing tags once item 2 ships. It is the first step of the build order above.

**Today:** an entity is a free-text `entity` field on each budget hit (expense or income), typed per transaction. There is no entity table, so "Costco" and "costco " are different values, and nothing lets the user fix a misspelling in old records. The profile page appears to be a placeholder (see item 5), and there is no settings area.

**Design decisions (confirmed 2026-11-23)**
- Routes (decided 2026-11-23): `/settings` lists the categories, each with a line of subtext, and each category has its own route. The first two are Bank accounts (`/settings/accounts`, the former accounts page moved with its list unchanged) and Payment entities (`/settings/entities`). The profile page keeps the name, email and sync status. The old `/accounts` route is removed with no redirect.
- Entity management: list the distinct entities in use with a count and total, rename one (which updates every record using it), and merge duplicates into one. A merge is a rename to a name that already exists. Rename and merge apply to both expenses and income. Both ask for confirmation first, showing how many records will change. There is no undo.
- Navigation: Settings opens from a settings icon on the profile page, next to the sign-out icon. The dark/light mode switch that sits there today moves into Settings, and the settings icon takes its place on the profile page. The mobile bottom nav stays at four tabs.
- Entities stay free text on the transaction. Settings only cleans up and standardizes existing values; it does not create a separate required entity list. The expense form can suggest existing entities as the user types.
- Matching for filters and merges uses a normalized form (trimmed, case-folded, Unicode-normalized), so look-alike spellings count as one entity.
- A rename or merge touches many rows at once and must succeed or fail as a whole, so it should be a versioned database function called through `rpc()` (see the persistence rule in `AGENTS.md`), scoped to the caller's household.
- Tag management is added here when item 2 ships: rename, recolor and delete (with confirmation), as decided in item 2.
- Entity and tag management need a connection, like budgets and accounts, and are not queued offline.
- Rename and merge sync the offline queue first. If any change on the device is still waiting or has failed, the user is asked to resolve it before renaming, so a retried entry cannot bring the old name back.
- Known limitation: a rename only covers records already on the server. Changes queued on another household member's device may later bring back the old name, and the user can merge it again.

**Built (entities page, 2026-11-23):** a list of entities with record count and total (sortable by name, record count or total) and a search box. One Edit action per row: a new name renames, a name that matches another entity merges (it uses that entity's spelling), and a change of case only is a normal rename. A confirmation shows how many records change (for example 43 records, 38 expenses and 5 income) and says it cannot be undone. The queue is synced first and the rename is refused while changes are waiting or failed. Offline, the list is read-only and built from the months saved on the device. After a rename the open month and the recent saved months are refreshed; older saved months keep the old name until they are opened online again. Database: migration `20261123120000_add_entity_management.sql`, run once against a throwaway Postgres 15 with stand-in tables (grouping, rename, merge, repeat, household isolation, transfers untouched, grants). It has not run against Supabase itself, and there is no database test in the repo.

**Open questions**
- Whether Settings later also holds profile and household settings is left to the item 5 discussion.

## 11. Custom reports

**Decided:** this replaces the Tags tab on the Budgets page that item 2 used to describe. A button on the Home page opens a Custom reports page. The user picks a date range, then filters the matching expenses by budget, tag and entity (payer or payee), to answer precise questions about their spending. Example: how much was spent on gas and groceries (budgets) over the last two weeks, counting only expenses tagged with a recent road trip (tag).

**Today:** nothing like this exists. Month views and tag totals are limited to loaded months, and the offline cache holds only three months.

**Design decisions (confirmed 2026-11-23, except where noted in the open questions)**
- Expenses only to start. Income and transfers could be added later behind a type toggle.
- Filters: date range (required), budgets, tags and entities. Within one filter several values combine as OR (gas or groceries). Different filters combine as AND (those budgets, and that tag, and that date range). Tags need a choice: expenses with any of the chosen tags, or all of them. Default to any, with an all option.
- Entity is the free-text field on the expense. The filter matches on the normalized form described in item 10 and suggests existing values as the user types.
- The report is computed by a server route that filters in the database for the chosen range (for example `/api/reports`). It must not filter only the months already loaded in the store, because the range can cover months that are not loaded.
- First output: the total, a breakdown by budget and by entity, and the matching line items. Layout needs planning before implementation. Saved reports, CSV export and charts are later ideas.
- The page needs a connection at first and says so when offline, because the offline cache holds only three months and could give an incomplete answer without saying so.

**Open questions**
- Layout of the report page (summary first, or line items first) and of the filter controls on a phone.
- Should tags use "any" or "all" by default, and should "all" be offered at launch?
- Should the report allow "No budget" and "no tag" as filter values?
- Should reports be saveable or shareable with the household, or are they one-off?
- Include income and transfers later, and how do budget and tag filters apply to them?
- Maximum date range, and how large a result is shown or paged.
- Relationship to item 9: could a language model later produce the filters from a question?

## Cross-cutting notes

- Any schema change follows the migration rules in `AGENTS.md`. Merging to `main` applies migrations to production with no approval step.
- Features 3, 4 and 5 all benefit from deciding up front how household scoping and "who did this" are represented.
- Features 3, 6 and 8 all create or change transactions; agree on one idempotency approach (the existing `operationId`) before building more than one of them.
