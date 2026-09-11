import { getSupabase } from '~/composables/supabase/client'
import { useBootstrapApi } from '~/composables/api/useBootstrapApi'
import { useProfileStore } from '~/stores/profile'
import { useAccountsStore } from '~/stores/accounts'
import { useFinanceStore } from '~/stores/finance'
import { useSavingsStore } from '~/stores/savings'
import type { BootstrapResponse, OfflineFinanceSnapshot } from '~/types/bootstrap'
import {
  clearOfflineFinanceCache,
  getOfflineFinanceSnapshot,
  getOfflineFinanceSnapshotForMonth,
  saveOfflineFinanceSnapshot,
} from '~/utils/offlineFinanceCache.client'

const WRITE_ACTIONS = new Set([
  'addAccount', 'editAccount', 'editAccountBaseline', 'removeAccount',
  'addIncome', 'removeIncome', 'updateIncome',
  'addExpense', 'removeExpense', 'updateExpense',
  'addTransfer', 'updateTransfer', 'removeTransfer',
  'addBudget', 'addExistingBudget', 'addExistingBudgets',
  'editBudgetPeriod', 'editBudgetMetadata', 'removeBudget',
  'copyPreviousMonthBudgets',
])

export function useAppData() {
  const profileStore = useProfileStore()
  const accountsStore = useAccountsStore()
  const financeStore = useFinanceStore()
  const savingsStore = useSavingsStore()
  const { getBootstrap } = useBootstrapApi()
  const isReady = useState('app-data-is-ready', () => false)
  const isLoading = useState('app-data-is-loading', () => false)
  const refreshing = useState('app-data-refreshing', () => false)
  const isOffline = useState('app-data-offline', () => import.meta.client && !navigator.onLine)
  const lastSyncedAt = useState<string | null>('app-data-last-synced-at', () => null)
  const activeUserId = useState<string | null>('app-data-user-id', () => null)
  const actionsRegistered = useState('app-data-actions-registered', () => false)
  let pollingTimer: ReturnType<typeof setInterval> | null = null
  let persistTimer: ReturnType<typeof setTimeout> | null = null
  let visibilityHandler: (() => void) | null = null
  let onlineHandler: (() => void) | null = null
  let offlineHandler: (() => void) | null = null
  let refreshPromise: Promise<void> | null = null

  function applyPayload(payload: BootstrapResponse) {
    if (payload.userId !== activeUserId.value) throw new Error('Cached data belongs to another user')
    savingsStore.hydrate(payload.savings)
    profileStore.hydrate(payload.profile)
    accountsStore.hydrate(payload.accounts)
    financeStore.hydrate(payload.finance)
    lastSyncedAt.value = payload.syncedAt
    isReady.value = true
  }

  function clearStores() {
    profileStore.clear()
    accountsStore.clear()
    financeStore.clear()
    savingsStore.invalidateCache()
    isReady.value = false
    lastSyncedAt.value = null
  }

  function buildSnapshot(): OfflineFinanceSnapshot | null {
    if (!activeUserId.value || !profileStore.profile) return null
    const snapshot: OfflineFinanceSnapshot = {
      cacheVersion: 1,
      schemaVersion: 1,
      userId: activeUserId.value,
      syncedAt: lastSyncedAt.value ?? new Date().toISOString(),
      profile: profileStore.profile,
      accounts: accountsStore.accounts,
      finance: financeStore.snapshot(),
      savings: savingsStore.snapshot(),
    }
    return JSON.parse(JSON.stringify(snapshot)) as OfflineFinanceSnapshot
  }

  async function persist() {
    const snapshot = buildSnapshot()
    if (snapshot) await saveOfflineFinanceSnapshot(snapshot)
  }

  function schedulePersist() {
    if (!isReady.value) return
    lastSyncedAt.value = new Date().toISOString()
    if (persistTimer) clearTimeout(persistTimer)
    persistTimer = setTimeout(() => void persist(), 100)
  }

  function registerSuccessfulActionPersistence() {
    if (actionsRegistered.value) return
    actionsRegistered.value = true
    for (const store of [accountsStore, financeStore]) {
      store.$onAction(({ name, after }) => {
        if (WRITE_ACTIONS.has(name)) after(schedulePersist)
      })
    }
  }

  async function revalidate() {
    if (refreshPromise) return refreshPromise
    refreshPromise = (async () => {
      refreshing.value = isReady.value
      try {
        const { year, month } = financeStore.selectedMonth
        const payload = await getBootstrap(year, month)
        applyPayload(payload)
        isOffline.value = false
        await persist()
      } catch (error) {
        const status = (error as any)?.statusCode ?? (error as any)?.status ?? (error as any)?.response?.status
        if (status === 401) {
          await clearOfflineFinanceCache()
          clearStores()
          activeUserId.value = null
          await navigateTo('/')
          return
        }
        isOffline.value = import.meta.client ? !navigator.onLine || isReady.value : false
        if (!isReady.value) throw error
      } finally {
        refreshing.value = false
        refreshPromise = null
      }
    })()
    return refreshPromise
  }

  async function load() {
    isLoading.value = true
    try {
      const supabase = getSupabase()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user?.id) throw new Error('Not authenticated')
      if (isReady.value && activeUserId.value === session.user.id) return
      if (activeUserId.value && activeUserId.value !== session.user.id) {
        await clearOfflineFinanceCache()
        clearStores()
      }
      activeUserId.value = session.user.id
      registerSuccessfulActionPersistence()
      if ('caches' in globalThis) void caches.delete('nuxt-api')

      try {
        const cached = await getOfflineFinanceSnapshot(session.user.id, financeStore.selectedMonth)
        if (cached) applyPayload(cached)
      } catch (error) {
        console.warn('Could not read the offline finance cache:', error)
      }

      if (isReady.value) void revalidate()
      else await revalidate()
    } finally {
      isLoading.value = false
    }
  }

  async function refresh() {
    await revalidate()
  }

  async function selectMonth(year: number, month: number) {
    if (!activeUserId.value) throw new Error('Not authenticated')
    if (refreshPromise) await refreshPromise

    const cached = await getOfflineFinanceSnapshotForMonth(activeUserId.value, year, month)
    if (cached) applyPayload(cached)

    if (!navigator.onLine) {
      isOffline.value = true
      if (!cached) throw new Error('This month has not been saved for offline use yet.')
      return
    }

    refreshing.value = true
    try {
      const payload = await getBootstrap(year, month)
      applyPayload(payload)
      isOffline.value = false
      await persist()
    } catch (error) {
      if (!cached) throw error
      isOffline.value = true
    } finally {
      refreshing.value = false
    }
  }

  function startPolling(intervalMs = 5 * 60 * 1000) {
    stopPolling()
    pollingTimer = setInterval(() => {
      if (document.visibilityState !== 'hidden' && navigator.onLine) void refresh()
    }, intervalMs)
    visibilityHandler = () => {
      if (document.visibilityState === 'visible' && isReady.value && navigator.onLine) void refresh()
    }
    onlineHandler = () => {
      isOffline.value = false
      if (isReady.value) void refresh()
    }
    offlineHandler = () => { isOffline.value = true }
    document.addEventListener('visibilitychange', visibilityHandler)
    window.addEventListener('online', onlineHandler)
    window.addEventListener('offline', offlineHandler)
  }

  function stopPolling() {
    if (pollingTimer) clearInterval(pollingTimer)
    pollingTimer = null
    if (visibilityHandler) document.removeEventListener('visibilitychange', visibilityHandler)
    if (onlineHandler) window.removeEventListener('online', onlineHandler)
    if (offlineHandler) window.removeEventListener('offline', offlineHandler)
    visibilityHandler = onlineHandler = offlineHandler = null
  }

  return {
    isReady: readonly(isReady),
    isLoading: readonly(isLoading),
    refreshing: readonly(refreshing),
    isOffline: readonly(isOffline),
    lastSyncedAt: readonly(lastSyncedAt),
    load,
    refresh,
    selectMonth,
    startPolling,
    stopPolling,
  }
}
