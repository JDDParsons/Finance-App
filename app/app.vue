<script setup lang="ts">
import { useAccountsStore } from './stores/accounts'

const accountsStore = useAccountsStore()
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

const isAuthenticated = computed(() => route.path !== '/')
const showMonthShortcut = computed(() => false)
const showProfileShortcut = computed(() => false)

onMounted(async () => {
  accountsStore.ensureLoaded()
  await Promise.all([
    router.isReady(),
    new Promise(resolve => setTimeout(resolve, 1000)),
  ])
  isLoading.value = false
})
</script>

<template>
  <UApp class="overflow-x-hidden">
    <Transition leave-active-class="transition-opacity duration-500 ease-in-out" leave-to-class="opacity-0">
      <div
        v-if="isLoading"
        class="fixed inset-0 z-100 flex flex-col items-center pt-safe bg-linear-to-b from-green-500 to-emerald-600"
      >
        <div class="pt-25">
          <img
            :src="`${runtimeConfig.app.baseURL}BudgifyWithLabel.png`"
            alt="Budgify"
            class="h-90 brightness-0 invert"
          />
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
