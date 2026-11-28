# Budgify tech stack

Verified against `package.json`, `nuxt.config.ts` and the source tree.

## Application

| Layer | Technology |
| --- | --- |
| Framework | Nuxt 4 (`ssr: false`, client-rendered SPA, `srcDir: 'app'`), Vue 3, TypeScript |
| UI | `@nuxt/ui` v4 with Iconify icon collections (heroicons, lucide, streamline, etc.), bundled locally via `icon.serverBundle` (server) and `icon.clientBundle` (embedded in the precached client bundle so icons render offline) |
| State | Pinia (`profile`, `accounts`, `finance`, `savings` stores) |
| Charts | Chart.js with vue-chartjs |
| PWA | `@vite-pwa/nuxt` (service worker updated behind the splash screen at launch or after a long time in the background, standalone manifest) |
| Offline storage | IndexedDB through `idb` (database `budgify-offline`: snapshots, preferences, outbox) |
| Server | Nitro routes in `server/api/`, deployed as Vercel functions |

## Backend and data

- **Supabase**: Postgres with RLS, email OTP auth, local stack via the Supabase CLI (`supabase` dev dependency).
- **Access pattern**: the browser Supabase client is used for auth/session only. All data access goes through Nuxt server routes using a user-scoped client (anon key plus the caller's JWT, so RLS applies). The service-role key is used by the login-code route and the keep-alive cron; keep it out of any other path unless there is a clear need.
- **Schema**: versioned migrations in `supabase/migrations/`. Atomic multi-table writes use security-definer PostgreSQL functions called through `rpc()`.
- **Not used**: Prisma (an earlier design; no longer in the project).

## Tooling and delivery

- **Hosting**: Vercel (root URLs, legacy `/Finance-App` redirects, daily keep-alive cron).
- **CI**: GitHub Actions dry-run migrations on PRs to `main` and push them to production on merge.
- **Tests**: Node built-in test runner (`node --test --experimental-strip-types tests/*.test.mjs`).
- **Local dev**: `run-app.ps1` (Supabase in Docker plus Nuxt on the Windows host); optional Docker Compose dev container.
- **Node**: 22 (Dockerfile base image `node:22-alpine`).

## Legacy (scheduled for removal)

The statement upload feature uses `papaparse` for CSV parsing and the `Transaction*`/`Category` tables. See the README for the full footprint.

Some dependencies (`pg`, `ts-node`, `csv-parse`) were not found in the code that was reviewed and may be removable; verify with a search before removing.
