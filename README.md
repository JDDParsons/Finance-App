# Nuxt Minimal Starter

Look at the [Nuxt documentation](https://nuxt.com/docs/getting-started/introduction) to learn more.

## Setup

Make sure to install dependencies:

```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install

# bun
bun install
```

---

## Frontend-only mode ✅

This project now uses client-side Supabase calls via the composable `app/composables/supabase.ts`.
Server endpoints under `server/api` that previously used Prisma / Node have been deprecated (return 410). To remove the Node backend entirely, you can:

1. Delete the `server` and `prisma` folders.
2. Remove the Prisma-related packages from `package.json` (`prisma`, `@prisma/client`, `@prisma/adapter-pg`, `pg`).
3. Run `npm install` to update dependencies.

If you'd like, I can perform these deletions and cleanups for you.

## Development Server

For local development, start Supabase in Docker and Nuxt directly on Windows:

```powershell
.\run-app.ps1 -RestartSupabase
```

The restart is needed the first time so Supabase Auth picks up the localhost URL.
After that, use `.\run-app.ps1` for normal starts.

Use `.\run-app.ps1 -OpenBrowser` to open Nuxt, Supabase Studio, and Mailpit
after the Nuxt development server is ready.

This provides:

- Nuxt: `http://localhost:3000`
- Supabase Studio: `http://localhost:54323`
- Mailpit: `http://localhost:54324`

The launcher gets the local API URL and keys from the Supabase CLI and passes them
to Nuxt without modifying the production values in `.env`. Press Ctrl+C to stop
Nuxt, then run `.\stop-app.ps1` when you also want to stop local Supabase.

To run only the Nuxt development server using the values already in your environment:

```bash
# npm
npm run dev

# pnpm
pnpm dev

# yarn
yarn dev

# bun
bun run dev
```

## Production

### Root URLs on Vercel

Budgify defaults to root hosting: login is at `https://www.budgify.ca/`
and authenticated users land at `https://www.budgify.ca/home`.
In Vercel, ensure `NUXT_APP_BASE_URL` is absent or set to `/` in production
and preview environments before redeploying. The same setting is used for
routes, public assets, and the PWA manifest and service worker at build time.
For other hosts that require a subpath, set `NUXT_APP_BASE_URL` to that path
with a trailing slash before building.

`vercel.json` permanently redirects `/Finance-App` and its child paths to
their root equivalents, preserving query strings. After deploying, check
login, direct page refreshes, icons, API requests, and a legacy bookmark
such as `/Finance-App/home?month=10` on a Vercel preview and production.

The PWA identity and scope move from `/Finance-App/` to `/`. Existing
installed apps may need to be removed and reinstalled from the root URL.
Check launch and updates from an existing installation as well as a fresh
installation; an old service worker may serve cached pages before the
request reaches Vercel's redirects.

### Supabase keep-alive cron

The Vercel deployment runs `GET /api/cron/keep-alive` daily at 05:00 UTC to
generate Supabase database activity. The route is configured in `vercel.json`
and uses the existing server-side Supabase service-role credentials.

Add a random secret of at least 16 characters to the Vercel project as the
`CRON_SECRET` environment variable. Vercel sends it to the route as
`Authorization: Bearer <CRON_SECRET>`. Requests without the matching secret are
rejected.

The deployment also requires `NUXT_PUBLIC_SUPABASE_URL` and
`NUXT_SUPABASE_SERVICE_ROLE_KEY`.

Supabase inactivity detection is usage-based, so this cron is a best-effort
keep-alive rather than a guarantee that a Free Plan project will never pause.

Build the application for production:

```bash
# npm
npm run build

# pnpm
pnpm build

# yarn
yarn build

# bun
bun run build
```

Locally preview production build:

```bash
# npm
npm run preview

# pnpm
pnpm preview

# yarn
yarn preview

# bun
bun run preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.
