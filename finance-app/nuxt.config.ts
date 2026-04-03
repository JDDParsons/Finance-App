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
        { rel: 'apple-touch-icon', href: '/Finance-App/sheep.jpg' },
      ],
      meta: [
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
        { name: 'apple-mobile-web-app-title', content: 'Pasture' },
      ],
    },
  },
  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'Pasture',
      short_name: 'Pasture',
      description: 'Pasture Finance App',
      theme_color: '#ffffff',
      background_color: '#ffffff',
      display: 'standalone',
      scope: '/Finance-App/',
      start_url: '/Finance-App/',
      icons: [
        {
          src: 'sheep.jpg',
          sizes: '192x192',
          type: 'image/jpeg',
        },
        {
          src: 'sheep.jpg',
          sizes: '512x512',
          type: 'image/jpeg',
        },
        {
          src: 'sheep.jpg',
          sizes: '512x512',
          type: 'image/jpeg',
          purpose: 'maskable',
        },
      ],
    },
    devOptions: {
      enabled: true,
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