// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  srcDir: 'app',
  ssr: false,
  devtools: { enabled: true },
  modules: ['@nuxt/ui', '@pinia/nuxt', '@vite-pwa/nuxt'],
  css: ['@/assets/css/main.css'],
  app: {
    baseURL: '/Finance-App/',
    head: {
      link: [
        { rel: 'icon', type: 'image/png', href: '/Finance-App/Budgify.png' },
        { rel: 'apple-touch-icon', href: '/Finance-App/Budgify.png' },
        // Single fallback startup image for iOS standalone mode.
        // iOS does not support manifest-driven splash reliably across versions.
        { rel: 'apple-touch-startup-image', href: '/Finance-App/BudgifyWithLabel.png' },
      ],
      meta: [
        { name: 'theme-color', content: '#ffffff' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
        { name: 'apple-mobile-web-app-title', content: 'Budgify' },
      ],
    },
  },
  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'Budgify',
      short_name: 'Budgify',
      theme_color: '#ffffff',
      background_color: '#ffffff',
      display: 'standalone',
    },
  },
  runtimeConfig: {
      public: {
      supabaseUrl: process.env.NUXT_PUBLIC_SUPABASE_URL || '',
      supabaseAnonKey: process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY || '',
      isCI: !!process.env.CI,
      isMobile: process.env.NUXT_PUBLIC_IS_MOBILE === 'true',
    },
  }
})