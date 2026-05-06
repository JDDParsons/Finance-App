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
        {
          rel: 'apple-touch-startup-image',
          href: '/Finance-App/splash/splash.png',
          media: '(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)',
        },
        {
          rel: 'apple-touch-startup-image',
          href: '/Finance-App/splash/splash.png',
          media: '(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
        },
        {
          rel: 'apple-touch-startup-image',
          href: '/Finance-App/splash/splash.png',
          media: '(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
        },
        {
          rel: 'apple-touch-startup-image',
          href: '/Finance-App/splash/splash.png',
          media: '(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)',
        },
        {
          rel: 'apple-touch-startup-image',
          href: '/Finance-App/splash/splash.png',
          media: '(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
        },
        {
          rel: 'apple-touch-startup-image',
          href: '/Finance-App/splash/splash.png',
          media: '(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
        },
      ],
      meta: [
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
        { name: 'apple-mobile-web-app-title', content: 'Budgify' },
      ],
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