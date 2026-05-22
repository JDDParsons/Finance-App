<script setup lang="ts">
import { useAppData } from '~/composables/useAppData'

const appData = useAppData()
const route = useRoute()
const router = useRouter()
const runtimeConfig = useRuntimeConfig()
const colorMode = useColorMode()

// Dynamically update theme-color so the iOS PWA status bar matches dark/light mode
useHead(() => ({
  meta: [
    { name: 'theme-color', content: colorMode.value === 'dark' ? '#030712' : '#ffffff' },
  ],
}))

const isLoading = ref(true)
const loadError = ref(false)

const isAuthenticated = computed(() => route.path !== '/')
const showMonthShortcut = computed(() => false)
const showProfileShortcut = computed(() => false)

async function loadAndStart() {
  isLoading.value = true
  loadError.value = false
  try {
    await appData.load()
    document.documentElement.classList.add('app-loaded')
    isLoading.value = false
    appData.startPolling()
  } catch {
    // Keep the splash visible as an error screen; don't start polling on failure.
    document.documentElement.classList.add('app-loaded')
    loadError.value = true
    isLoading.value = false
  }
}

onMounted(async () => {
  await router.isReady()
  if (route.path === '/') {
    // Login page: user isn't authenticated yet, nothing to fetch
    document.documentElement.classList.add('app-loaded')
    isLoading.value = false
    return
  }
  await loadAndStart()
})

// Post-login: when the user authenticates and is redirected away from '/'
watch(() => route.path, async (newPath, oldPath) => {
  if (oldPath === '/' && newPath !== '/' && !appData.isReady.value) {
    await loadAndStart()
  }
})
</script>

<template>
  <UApp class="overflow-x-hidden">
    <Transition leave-active-class="transition-opacity duration-500 ease-in-out" leave-to-class="opacity-0">
      <div
        v-if="isLoading || loadError"
        class="fixed inset-0 z-[100] flex flex-col items-center pt-safe bg-linear-to-b from-green-500 to-emerald-600"
      >
        <!-- Normal loading state -->
        <div v-if="!loadError" class="pt-25">
          <img
            :src="`${runtimeConfig.app.baseURL}BudgifyWithLabel.png`"
            alt="Budgify"
            class="h-90 brightness-0 invert"
          />
        </div>

        <!-- Error state: stay on splash, offer retry -->
        <div v-else class="flex flex-col items-center gap-4 px-8 pt-25">
          <img
            :src="`${runtimeConfig.app.baseURL}BudgifyWithLabel.png`"
            alt="Budgify"
            class="h-60 brightness-0 invert"
          />
          <p class="mt-4 text-sm text-white/90 text-center">
            Couldn't load your data. Please check your connection.
          </p>
          <button
            class="mt-1 rounded-full bg-white/20 px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/30 active:bg-white/40"
            @click="loadAndStart"
          >
            Try again
          </button>
        </div>
      </div>
    </Transition>

    <SideNav v-if="isAuthenticated" class="hidden lg:flex" />
    <div :class="isAuthenticated ? 'lg:pl-56' : ''" class="relative">
      <NuxtPage />
    </div>
    <div
      v-if="showMonthShortcut"
      class="fixed left-4 z-40 lg:left-auto lg:right-20 top-safe-4"
    >
      <MonthSelector icon-only />
    </div>
    <NuxtLink
      v-if="showProfileShortcut"
      to="/profile"
      class="fixed right-4 z-40 top-safe-4 inline-flex items-center justify-center rounded-full border border-gray-200 bg-white/90 p-3 text-gray-600 shadow-lg shadow-black/10 backdrop-blur transition-colors hover:text-primary-500 dark:border-gray-700 dark:bg-gray-900/90 dark:text-gray-300 dark:hover:text-primary-400"
      aria-label="Open profile"
    >
      <UIcon name="heroicons-solid:user-circle" class="size-6" />
    </NuxtLink>
    <BottomNav v-if="isAuthenticated && route.path !== '/cashflow/create'" class="lg:hidden" />
    <SuccessOverlay />
  </UApp>
</template>
