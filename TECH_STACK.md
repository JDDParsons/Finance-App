# Budgify - Tech Stack Breakdown

## Frontend Framework
- **Nuxt 3** - Vue 3 framework with SSR/SSG capabilities
- **Vue 3** - Component-based UI framework
- **TypeScript** - Type-safe development

## Backend & Database
- **Supabase** - Backend-as-a-Service
  - PostgreSQL database
  - Authentication
  - Real-time subscriptions
  - Storage (for uploaded statements)

## UI Components & Charting
- **Custom Vue components** for:
  - Charts (Doughnut, Pie, Gauge)
  - Budget tracking
  - Expense/inincome cards
  - Date/category pickers
- **Chart.js/ChartJS** - Likely used for visualizations
- **Tailwind CSS** - Utility-first CSS (implied by Nuxt conventions)

## Key Directories
- `/app` - Main Nuxt application
  - `/components` - Reusable UI components
  - `/pages` - Route pages
  - `/stores` - State management (Pinia/Store)
  - `/composables` - Vue composable functions
  - `/assets` - Static assets (images, CSS)
- `/supabase` - Supabase configuration & migrations
- `/scripts` - Build/automation scripts
- `/utils` - Helper functions

## DevOps
- **Git** - Version control
- **GitHub Actions** (`.github/`) - CI/CD
- **Nuxt build** - Production builds

## Third-party Libraries (Common in this stack)
- **Pinia** - Vue state management
- **Day.js/Luxon** - Date handling
- **Axios/Fetch** - API calls

---
*Concise overview for quick reference*