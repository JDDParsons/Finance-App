import { getSupabase } from '~/composables/supabase/client'
import { useBootstrapApi } from '~/composables/api/useBootstrapApi'
import { useProfileStore } from '~/stores/profile'
import { useAccountsStore } from '~/stores/accounts'
import { useFinanceStore } from '~/stores/finance'
import { useSavingsStore } from '~/stores/savings'
import { discardFailedOfflineOperations, replayOfflineOperations } from '~/utils/offlineQueue.client'
import { isSessionExpiredError, resolveSession } from '~/composables/supabase/session'
import type { BootstrapResponse, OfflineFinanceSnapshot } from '~/types/bootstrap'
import {
  clearOfflineFinanceCache,
  getOfflineFinanceSnapshot,
  getOfflineFinanceSnapshotForMonth,
  saveOfflineFinanceSnapshot,
  getOfflineOperations,
  markOfflineFailedInSnapshots,
  reconcileOfflineSnapshots,
  saveOfflineMonthSnapshot,
} from '~/utils/offlineFinanceCache.client'

// Months kept on the device for offline use: the current month and the two before it.
const PRECACHE_MONTH_COUNT = 3
// A pre-cached month newer than this is not fetched again.
const PRECACHE_MAX_AGE_MS = 30 * 60 * 1000

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
  let precaching = false

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
    const operations = await getOfflineOperations(activeUserId.value)
    pendingSyncCount.value = operations.filter(operation => operation.status === 'pending').length
    failedSyncCount.value = operations.filter(operation => operation.status === 'failed').length
    if (restoreRows) operations.forEach(financeStore.restoreOfflineOperation)
  }

  // The server rejected the login, or there is none. Unsynced changes are kept:
  // the offline cache and outbox stay on the device and replay after the same
  // user signs in again. Only the in-memory data and the local login are cleared.
  async function handleSessionExpired() {
    stopPolling()
    clearStores()
    activeUserId.value = null
    try {
      await getSupabase().auth.signOut({ scope: 'local' })
    } catch {
      // The local login is cleared best-effort; the login page still opens.
    }
    await navigateTo('/?expired=1')
  }

  async function syncOutbox(retryFailed = false) {
    if (!activeUserId.value || !navigator.onLine || syncing.value) return
    syncing.value = true
    try {
      const results = await replayOfflineOperations(activeUserId.value, retryFailed)
      for (const { operation, row, error } of results) {
        if (error) {
          financeStore.markOfflineOperationFailed(operation, error)
          await markOfflineFailedInSnapshots(activeUserId.value, operation.targetId, error)
        } else if (row) {
          financeStore.reconcileOfflineOperation(operation, row)
          await reconcileOfflineSnapshots(activeUserId.value, operation.targetId, row)
        } else {
          // A delete went through (or the row was already gone).
          await reconcileOfflineSnapshots(activeUserId.value, operation.targetId)
        }
      }
      await refreshOutboxState()
      await persist()
    } catch (error: any) {
      if (isSessionExpiredError(error)) {
        await handleSessionExpired()
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
    const discarded = await discardFailedOfflineOperations(activeUserId.value)
    // A discarded create never existed on the server, so its row just goes away.
    const creates = discarded.filter(operation => operation.action === 'create')
    financeStore.removeOfflineCreates(creates.map(operation => operation.id))
    for (const operation of creates) {
      await reconcileOfflineSnapshots(activeUserId.value, operation.id)
    }
    await refreshOutboxState()
    await persist()
    // A discarded edit or delete leaves the screen showing a change the server never got;
    // reload so the row shows what is actually saved.
    if (discarded.length > creates.length && navigator.onLine) await revalidate()
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
    if (!activeUserId.value) return
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
        void precacheRecentMonths()
      } catch (error) {
        if (isSessionExpiredError(error)) {
          await handleSessionExpired()
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

  // Save the current and previous two months for offline use, in the background and
  // without changing which month the app opens on. Failures are ignored: this is
  // only a head start, and the months are fetched again on the next refresh.
  /** `force` re-saves months even when the cached copy is recent, for after a bulk rename. */
  async function precacheRecentMonths(force = false) {
    if (precaching || !activeUserId.value || !navigator.onLine) return
    precaching = true
    const userId = activeUserId.value
    try {
      const today = new Date()
      for (let offset = 0; offset < PRECACHE_MONTH_COUNT; offset++) {
        const date = new Date(today.getFullYear(), today.getMonth() - offset, 1)
        const year = date.getFullYear()
        const month = date.getMonth() + 1
        const selected = financeStore.selectedMonth
        // The selected month was just saved by the refresh.
        if (selected.year === year && selected.month === month) continue
        const existing = await getOfflineFinanceSnapshotForMonth(userId, year, month)
        if (!force && existing && Date.now() - Date.parse(existing.syncedAt) < PRECACHE_MAX_AGE_MS) continue
        const payload = await getBootstrap(year, month)
        if (activeUserId.value !== userId || payload.userId !== userId) return
        await saveOfflineMonthSnapshot({ ...payload, cacheVersion: 1 })
      }
    } catch {
      // Ignored on purpose, see above.
    } finally {
      precaching = false
    }
  }

  async function load() {
    isLoading.value = true
    try {
      // 'offline' means signed in but the server can't be reached to refresh an
      // expired token; the cached data for the saved user is still shown.
      const auth = await resolveSession()
      if (auth.state === 'signed-out') throw new Error('Not authenticated')
      if (auth.state === 'offline') isOffline.value = true
      const userId = auth.userId
      if (isReady.value && activeUserId.value === userId) return
      if (activeUserId.value && activeUserId.value !== userId) {
        await clearOfflineFinanceCache()
        clearStores()
      }
      activeUserId.value = userId
      registerSuccessfulActionPersistence()
      if ('caches' in globalThis) void caches.delete('nuxt-api')

      try {
        const cached = await getOfflineFinanceSnapshot(userId, financeStore.selectedMonth)
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
    if (cached) {
      applyPayload(cached)
      // Cached months do not include changes still waiting to sync.
      await refreshOutboxState(true)
    }

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
    precacheRecentMonths,
    retryFailed,
    discardFailed,
    startPolling,
    stopPolling,
  }
}
