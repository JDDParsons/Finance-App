<script setup lang="ts">
import { useAppData } from '~/composables/useAppData'
import { applyUpdateAtLaunch, applyUpdateOnReturn, type LaunchUpdateResult } from '../utils/appUpdate'

const appData = useAppData()
const route = useRoute()
const router = useRouter()
const runtimeConfig = useRuntimeConfig()
const colorMode = useColorMode()
const transactionModal = useTransactionCreateModalStore()

const isLoading = ref(true)
const loadError = ref(false)
// Puts the splash back up while an update is applied on return to the app.
const isApplyingOnReturn = ref(false)
const showSplash = computed(() => isLoading.value || loadError.value || isApplyingOnReturn.value)

// The iOS PWA status bar takes theme-color: the splash green while the splash is
// up, then the page color for dark/light mode.
useHead(() => ({
  meta: [
    {
      name: 'theme-color',
      content: showSplash.value
        ? '#22c55e'
        : colorMode.value === 'dark' ? '#0f172b' : '#ffffff',
    },
  ],
}))

const isUpdating = ref(false)
// Started once per launch; the splash does not drop until it has settled.
let launchUpdate: Promise<LaunchUpdateResult> = Promise.resolve('continue')

// There is no service worker in development.
function serviceWorkerContainer() {
  return import.meta.dev ? undefined : navigator.serviceWorker
}

function startLaunchUpdate() {
  const { baseURL } = runtimeConfig.app
  return applyUpdateAtLaunch({
    container: serviceWorkerContainer(),
    scriptUrl: `${baseURL}sw.js`,
    scope: baseURL,
    isOnline: () => navigator.onLine,
    reload: () => window.location.reload(),
    onUpdating: () => { isUpdating.value = true },
  })
}

let hiddenAt: number | null = null

async function handleVisibilityChange() {
  if (document.visibilityState === 'hidden') {
    hiddenAt = Date.now()
    return
  }
  if (hiddenAt === null) return
  const hiddenForMs = Date.now() - hiddenAt
  hiddenAt = null
  // A launch or an earlier return is already handling updates.
  if (isLoading.value || isApplyingOnReturn.value) return

  const result = await applyUpdateOnReturn({
    container: serviceWorkerContainer(),
    scope: runtimeConfig.app.baseURL,
    hiddenForMs,
    isOnline: () => navigator.onLine,
    reload: () => window.location.reload(),
    onUpdating: () => {
      isApplyingOnReturn.value = true
      isUpdating.value = true
    },
  })
  if (result === 'continue' && isApplyingOnReturn.value) {
    isApplyingOnReturn.value = false
    isUpdating.value = false
  }
}

// True when the app is about to reload into a new version, so the splash stays up.
async function isReloadingForUpdate() {
  if (await launchUpdate === 'reloading') return true
  isUpdating.value = false
  return false
}

const isAuthenticated = computed(() => route.path !== '/')
const showMonthShortcut = computed(() => false)
const showProfileShortcut = computed(() => false)
const syncStatus = computed(() => {
  if (appData.syncing.value) return 'Syncing offline changes…'
  if (appData.failedSyncCount.value) return `${appData.failedSyncCount.value} change${appData.failedSyncCount.value === 1 ? '' : 's'} need attention`
  if (appData.pendingSyncCount.value) return `${appData.pendingSyncCount.value} change${appData.pendingSyncCount.value === 1 ? '' : 's'} waiting to sync`
  if (appData.isOffline.value) {
    if (!appData.lastSyncedAt.value) return 'Offline'
    return `Offline · saved ${new Date(appData.lastSyncedAt.value).toLocaleString()}`
  }
  return appData.refreshing.value ? 'Updating…' : null
})

async function discardFailedChanges() {
  if (!window.confirm('Discard all failed offline changes? This cannot be undone.')) return
  await appData.discardFailed()
}

async function loadAndStart() {
  isLoading.value = true
  loadError.value = false
  try {
    await appData.load()
    if (await isReloadingForUpdate()) return
    document.documentElement.classList.add('app-loaded')
    isLoading.value = false
    appData.startPolling()
  } catch {
    // A new version may be what fixes the load, so let it apply first.
    if (await isReloadingForUpdate()) return
    // Keep the splash visible as an error screen; don't start polling on failure.
    document.documentElement.classList.add('app-loaded')
    loadError.value = true
    isLoading.value = false
  }
}

onMounted(async () => {
  // Runs alongside the data load, so a launch without an update is barely slower.
  launchUpdate = startLaunchUpdate()
  document.addEventListener('visibilitychange', handleVisibilityChange)
  await router.isReady()
  if (route.path === '/') {
    // Login page: user isn't authenticated yet, nothing to fetch
    if (await isReloadingForUpdate()) return
    document.documentElement.classList.add('app-loaded')
    isLoading.value = false
    return
  }
  await loadAndStart()
})

onUnmounted(() => document.removeEventListener('visibilitychange', handleVisibilityChange))

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
        v-if="showSplash"
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

        <!-- A new version is being installed before the app opens -->
        <Transition enter-active-class="transition-opacity duration-300" enter-from-class="opacity-0">
          <div
            v-if="isUpdating && !loadError"
            class="absolute inset-x-0 bottom-safe-12 flex items-center justify-center gap-2 text-sm font-semibold text-white/90"
            role="status"
          >
            <span class="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden="true" />
            Updating…
          </div>
        </Transition>
      </div>
    </Transition>

    <div
      v-if="isAuthenticated && syncStatus && !isLoading && !loadError"
      class="fixed left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-b-lg bg-gray-900/90 px-3 py-1.5 text-xs font-medium text-white shadow-lg top-below-header dark:bg-gray-100/90 dark:text-gray-900"
      role="status"
    >
      <span>{{ syncStatus }}</span>
      <template v-if="appData.failedSyncCount.value">
        <button class="underline" :disabled="appData.syncing.value" @click="appData.retryFailed()">
          Retry
        </button>
        <button class="underline" :disabled="appData.syncing.value" @click="discardFailedChanges">
          Discard
        </button>
      </template>
    </div>

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
    <BottomNav v-if="isAuthenticated && !isLoading && !loadError" class="lg:hidden" />
    <CashflowCreateModal
      v-if="isAuthenticated && transactionModal.isOpen"
      :initial-date="transactionModal.initialDate"
      :initial-budget-id="transactionModal.initialBudgetId"
      @closed="transactionModal.close()"
    />
    <SuccessOverlay />
  </UApp>
</template>
