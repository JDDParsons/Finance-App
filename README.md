# Budgify

Budgify is a household budgeting app for tracking monthly budgets, expenses, income, transfers between accounts, and savings. It is an installable PWA (Nuxt 4 single-page app) backed by Supabase, deployed on Vercel at <https://www.budgify.ca>.

Access is invite-only: a login code is only sent to emails that the `is_authorized_email` database function approves.

Planned work is tracked in [ROADMAP.md](ROADMAP.md).

## Features

| Area | Route | What it does |
| --- | --- | --- |
| Home | `/home` | Monthly dashboard: spending charts, daily spending calendar/figure, budget usage radar, cumulative spending |
| Budgets | `/budgets`, `/budgets/[id]` | Month-based budgets (expense and income), copy previous month, budget history, allocation charts |
| Cashflow | `/cashflow` | Create and review expenses, income and transfers; daily/weekly grouped table |
| Profile | `/profile` | Name, email and sync status, with links to Settings and sign-out |
| Settings | `/settings`, `/settings/accounts`, `/settings/entities` | A list of setting categories. Bank accounts (baseline values, appearance, transfers) live at `/settings/accounts`; payment entities at `/settings/entities` (list with record counts and totals, search, rename and merge; needs a connection to change anything). Holds the light/dark switch |
| Savings | `/savings` | Trailing savings summary derived from budget data |
| Offline | (all) | Last-synced data is cached on the device and the app opens without a connection; expenses, income and transfers can be added, edited and deleted offline; those changes are queued and synced the next time the app is open and online. The current month and the two before it are kept for offline use |

### Deprecated: statement upload (`/upload`)

Bank-statement CSV upload and the transaction categorization screens are **legacy and planned for removal**. They are not part of the core budgeting flow, are only linked from the desktop side navigation, and are not being maintained. Don't build on them. See [Statement upload (legacy)](#statement-upload-legacy-scheduled-for-removal) for what they touch, so removal is clean.

## Stack

Nuxt 4 (`ssr: false`, `srcDir: 'app'`), Vue 3, TypeScript, Nuxt UI, Pinia, Chart.js via vue-chartjs, `@vite-pwa/nuxt`, `idb` (IndexedDB), Supabase (Postgres, Auth, RLS). See [TECH_STACK.md](TECH_STACK.md) for details and [AGENTS.md](AGENTS.md) for architecture and contribution rules.

## Getting started

Prerequisites: Node.js 22, Docker Desktop (for local Supabase), Windows PowerShell for the launcher script.

```powershell
npm install
.\run-app.ps1 -RestartSupabase   # first run only, so Supabase Auth picks up the localhost URL
.\run-app.ps1                    # normal starts
.\run-app.ps1 -OpenBrowser       # also open Studio and Mailpit when Nuxt is ready
```

Docker Desktop must be running before you start. If `run-app.ps1` reports that Supabase failed to start, start Docker Desktop and check that ports 54321-54329 are free.

`run-app.ps1` starts the local Supabase stack, applies pending migrations (skip with `-SkipMigrations`), reads the local API URL and keys from the Supabase CLI, passes them to Nuxt as environment variables for that process only (your `.env` production values are not modified), and runs `npm run dev` on port 3000. Press Ctrl+C to stop Nuxt, then run `.\stop-app.ps1` to stop local Supabase.

| Service | URL |
| --- | --- |
| Nuxt | http://localhost:3000 |
| Supabase API | http://localhost:54321 |
| Supabase Studio | http://localhost:54323 |
| Mailpit (login codes) | http://localhost:54324 |

To run only Nuxt with values already in your environment: `npm run dev`.

A `Dockerfile` and `docker-compose.yml` run the dev server in a container attached to the local Supabase Docker network (`supabase_network_Finance-App`). They use `.env.docker`. Start local Supabase first (for example with `run-app.ps1`), since the container joins its network. `docker-compose.yml` is listed in `.gitignore`.

### Environment variables

There is no `.env.example`. Variables are read in `nuxt.config.ts`:

| Variable | Purpose |
| --- | --- |
| `NUXT_PUBLIC_SUPABASE_URL` | Supabase project URL (browser and server) |
| `NUXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/publishable key |
| `NUXT_SUPABASE_SERVICE_ROLE_KEY` | Server only. Used by the login-code route and the keep-alive cron (and, in local dev, passed in by `run-app.ps1`) |
| `CRON_SECRET` | Server only. At least 16 random characters; guards `/api/cron/keep-alive` |
| `NUXT_APP_BASE_URL` | Optional. Defaults to `/`. See below |
| `NUXT_PUBLIC_IS_MOBILE` | Optional. `true` enables the mobile flag in runtime config |

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Nuxt dev server |
| `npm run build` | Production build (the repo's validation command) |
| `npm run preview` | Preview a production build |
| `npm test` | Node's built-in test runner over `tests/*.test.mjs` |

Tests cover pure utilities, store/composable helpers, UI logic and migration SQL contents. There are no component, API-route or database/RLS tests.

## Database and migrations

Schema lives in `supabase/migrations/` as versioned SQL. Never edit applied migrations; add a new forward migration. The linked Supabase project is production.

GitHub Actions:

- **Check Supabase Migrations**: on pull requests to `main`, runs `supabase db push --dry-run`.
- **Deploy Supabase Migrations**: on push to `main`, runs `supabase db push` against production with no approval step. Review migration PRs carefully.

## Production

### Root URLs on Vercel

Budgify is served from the root: login at `https://www.budgify.ca/`, app at `/home`. In Vercel, `NUXT_APP_BASE_URL` must be absent or `/` in production and preview. The same value drives routes, public assets, the PWA manifest and the service worker at build time. For a host that needs a subpath, set `NUXT_APP_BASE_URL` to that path with a trailing slash before building.

`vercel.json` permanently redirects the legacy `/Finance-App` paths to their root equivalents, preserving query strings. After deploying, check login, direct page refreshes, icons, API requests, and a legacy bookmark such as `/Finance-App/home?month=10` on a preview and on production.

The PWA identity and scope moved from `/Finance-App/` to `/`. Existing installs may need to be removed and reinstalled from the root URL, and an old service worker can serve cached pages before Vercel's redirects apply. Test both an existing and a fresh install.

### Supabase keep-alive cron

Vercel calls `GET /api/cron/keep-alive` daily at 05:00 UTC (configured in `vercel.json`). The route queries the `Profile` table with the service-role key so the project registers activity. Set `CRON_SECRET` in Vercel; Vercel sends it as `Authorization: Bearer <CRON_SECRET>` and other requests get 401. The deployment also needs `NUXT_PUBLIC_SUPABASE_URL` and `NUXT_SUPABASE_SERVICE_ROLE_KEY`.

Supabase inactivity detection is usage-based, so this is a best-effort keep-alive, not a guarantee that a Free Plan project never pauses.

## Statement upload (legacy, scheduled for removal)

This feature is on its way out. Until it is removed, this is everything it touches:

- Pages: `app/pages/upload/` (`index.vue`, `transactions.vue`); nav entry in `app/components/SideNav.vue`
- Components: `app/components/upload/`
- Client API: `app/composables/api/useUploadApi.ts`, `useTransactionsApi.ts`
- Server routes: `server/api/upload.post.ts`, `server/api/transactions/*`; data access in `server/utils/supabase/transactions.ts`
- Parsing: `utils/parse.ts` (bank-specific CSV formats), `utils/attachCategoryLabel.ts`. The CSV is sent as text to the server and parsed there with Papa Parse
- Database: `Transaction`, `Transaction_Category`, `Category`, `Transaction_Groups` tables and the `get_transaction_categories` function
- Dependencies likely used only by it: `papaparse` (also externalized in `nuxt.config.ts`), `@types/papaparse`; check `csv-parse` and `uuid` before removing

Removing it should include a forward migration for the tables above, and an explicit decision on whether existing transaction data is kept or dropped.
