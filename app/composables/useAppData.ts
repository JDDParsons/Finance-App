import { getSupabase } from '~/composables/supabase/client'
import { useBootstrapApi } from '~/composables/api/useBootstrapApi'
import { useProfileStore } from '~/stores/profile'
import { useAccountsStore } from '~/stores/accounts'
import { useFinanceStore } from '~/stores/finance'
import { useSavingsStore } from '~/stores/savings'
import { discardFailedOfflineCreates, replayOfflineCreates } from '~/utils/offlineCreateQueue.client'
import type { BootstrapResponse, OfflineFinanceSnapshot } from '~/types/bootstrap'
import {
  clearOfflineFinanceCache,
  getOfflineFinanceSnapshot,
  getOfflineFinanceSnapshotForMonth,
  saveOfflineFinanceSnapshot,
  getOfflineCreates,
  markOfflineCreateFailedInSnapshots,
  reconcileOfflineCreateSnapshots,
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
  const pendingSyncCount = useState('app-data-pending-sync-count', () => 0)
  const failedSyncCount = useState('app-data-failed-sync-count', () => 0)
  const syncing = useState('app-data-syncing', () => false)
  let pollingTimer: ReturnType<typeof setInterval> | null = null
  let persistTimer: ReturnType<typeof setTimeout> | null = null
  let visibilityHandler: (() => void) | null = null
  let onlineHandler: (() => void) | null = null
  let offlineHandler: (() => void) | null = null
  let refreshPromise: Promise<void> | null = null
  let outboxHandler: (() => void) | null = null

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
    pendingSyncCount.value = 0
    failedSyncCount.value = 0
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

  async function refreshOutboxState(restoreRows = false) {
    if (!activeUserId.value) return
    const operations = await getOfflineCreates(activeUserId.value)
    pendingSyncCount.value = operations.filter(operation => operation.status === 'pending').length
    failedSyncCount.value = operations.filter(operation => operation.status === 'failed').length
    if (restoreRows) operations.forEach(financeStore.restoreOfflineCreate)
  }

  async function syncOutbox(retryFailed = false) {
    if (!activeUserId.value || !navigator.onLine || syncing.value) return
    syncing.value = true
    try {
      const results = await replayOfflineCreates(activeUserId.value, retryFailed)
      for (const result of results) {
        if (result.row) {
          financeStore.reconcileOfflineCreate(result.operation.kind, result.operation.id, result.row)
          await reconcileOfflineCreateSnapshots(activeUserId.value, result.operation.id, result.row)
        } else if (result.error) {
          financeStore.markOfflineCreateFailed(result.operation.kind, result.operation.id, result.error)
          await markOfflineCreateFailedInSnapshots(activeUserId.value, result.operation.id, result.error)
        }
      }
      await refreshOutboxState()
      await persist()
    } catch (error: any) {
      const status = error?.statusCode ?? error?.status ?? error?.response?.status
      if (status === 401) {
        await clearOfflineFinanceCache()
        clearStores()
        activeUserId.value = null
        await navigateTo('/')
        return
      }
      isOffline.value = !navigator.onLine
      throw error
    } finally {
      syncing.value = false
    }
  }

  async function discardFailed() {
    if (!activeUserId.value) return
    const discarded = await discardFailedOfflineCreates(activeUserId.value)
    financeStore.removeOfflineCreates(discarded.map(operation => operation.id))
    for (const operation of discarded) {
      await reconcileOfflineCreateSnapshots(activeUserId.value, operation.id)
    }
    await refreshOutboxState()
    await persist()
  }

  async function retryFailed() {
    await syncOutbox(true)
    await revalidate()
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
        await refreshOutboxState(true)
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

      await refreshOutboxState(true)

      if (isReady.value) {
        void syncOutbox().then(revalidate)
      } else {
        await revalidate()
        await refreshOutboxState(true)
        if (pendingSyncCount.value) {
          await syncOutbox()
          await revalidate()
        }
      }
    } finally {
      isLoading.value = false
    }
  }

  async function refresh() {
    await syncOutbox()
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
      await refreshOutboxState(true)
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
    outboxHandler = () => { void refreshOutboxState() }
    window.addEventListener('budgify-outbox-changed', outboxHandler)
  }

  function stopPolling() {
    if (pollingTimer) clearInterval(pollingTimer)
    pollingTimer = null
    if (visibilityHandler) document.removeEventListener('visibilitychange', visibilityHandler)
    if (onlineHandler) window.removeEventListener('online', onlineHandler)
    if (offlineHandler) window.removeEventListener('offline', offlineHandler)
    if (outboxHandler) window.removeEventListener('budgify-outbox-changed', outboxHandler)
    visibilityHandler = onlineHandler = offlineHandler = outboxHandler = null
  }

  return {
    isReady: readonly(isReady),
    isLoading: readonly(isLoading),
    refreshing: readonly(refreshing),
    isOffline: readonly(isOffline),
    lastSyncedAt: readonly(lastSyncedAt),
    pendingSyncCount: readonly(pendingSyncCount),
    failedSyncCount: readonly(failedSyncCount),
    syncing: readonly(syncing),
    load,
    refresh,
    selectMonth,
    syncOutbox,
    retryFailed,
    discardFailed,
    startPolling,
    stopPolling,
  }
}
