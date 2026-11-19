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
| 6 | Offline mode | Partly built | Offline cache and outbox |
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

**Today (built):** the last-synced month is cached in IndexedDB and the app can open while offline. New expenses, income and transfers made offline are queued with a client-generated `operationId`, shown optimistically, and replayed when the connection returns. The cache is cleared on sign-out and is tied to a user id.

**Not built:** edits and deletions require a connection. Only the data for months already synced is available offline. There is no conflict handling beyond idempotent creates.

**Open questions**
- Which of edit, delete, budget changes and account changes must work offline?
- How should conflicts be resolved when the same record was changed on two devices?
- Should more months be pre-cached, and how much storage is acceptable?
- Test coverage today is unit-level only (queue and cache helpers); real-device testing of the PWA offline behavior is still needed.

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
