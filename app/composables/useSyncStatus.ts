import { getSyncStatus } from '../../utils/syncStatus'
import { useAppData } from '~/composables/useAppData'

/** The app's sync status, shared by the header chip, the profile page and the banner. */
export function useSyncStatus() {
  const appData = useAppData()

  return computed(() => getSyncStatus({
    isOffline: appData.isOffline.value,
    syncing: appData.syncing.value,
    refreshing: appData.refreshing.value,
    pendingCount: appData.pendingSyncCount.value,
    failedCount: appData.failedSyncCount.value,
  }))
}
