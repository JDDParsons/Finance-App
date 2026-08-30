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
