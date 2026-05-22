import { useProfileStore } from '~/stores/profile'
import { useAccountsStore } from '~/stores/accounts'
import { useFinanceStore } from '~/stores/finance'
import { useSavingsStore } from '~/stores/savings'

export function useAppData() {
  const profileStore = useProfileStore()
  const accountsStore = useAccountsStore()
  const financeStore = useFinanceStore()
  const savingsStore = useSavingsStore()
  const isReady = useState('app-data-is-ready', () => false)
  const isLoading = useState('app-data-is-loading', () => false)
  let pollingTimer: ReturnType<typeof setInterval> | null = null
  let visibilityHandler: (() => void) | null = null

  /** Initial load — runs all stores in parallel, keeps splash visible until complete. */
  async function load() {
    if (isReady.value) return
    isLoading.value = true
    try {
      await Promise.all([
        profileStore.isReady ? Promise.resolve() : profileStore.init().catch(() => {}),
        accountsStore.fetchAccounts(),
        financeStore.fetchAll(),
        savingsStore.fetchAll(),
      ])
      isReady.value = true
    } finally {
      isLoading.value = false
    }
  }

  /** Silent background re-fetch — no loading/refreshing flags are set on any store. */
  async function refresh() {
    await Promise.all([
      accountsStore.fetchAccounts(true, true),
      financeStore.fetchAll(true),
      savingsStore.fetchAll(true, true),
    ])
  }

  /** Start auto-refresh every `intervalMs` ms. Pauses when the tab is hidden and fires immediately on tab restore. */
  function startPolling(intervalMs = 5 * 60 * 1000) {
    stopPolling()

    pollingTimer = setInterval(() => {
      if (typeof document === 'undefined' || document.visibilityState !== 'hidden') {
        refresh()
      }
    }, intervalMs)

    if (typeof document !== 'undefined') {
      visibilityHandler = () => {
        if (document.visibilityState === 'visible' && isReady.value) {
          refresh()
        }
      }
      document.addEventListener('visibilitychange', visibilityHandler)
    }
  }

  function stopPolling() {
    if (pollingTimer !== null) {
      clearInterval(pollingTimer)
      pollingTimer = null
    }
    if (visibilityHandler !== null && typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', visibilityHandler)
      visibilityHandler = null
    }
  }

  return {
    isReady: readonly(isReady),
    isLoading: readonly(isLoading),
    load,
    refresh,
    startPolling,
    stopPolling,
  }
}
