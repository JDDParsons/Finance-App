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

Start the development server on `http://localhost:3000`:

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
