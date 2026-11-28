export type SyncState = 'offline' | 'syncing' | 'synced' | 'attention'

export interface SyncStatusInput {
  isOffline: boolean
  syncing: boolean
  /** Fresh data is being fetched from the server. */
  refreshing?: boolean
  pendingCount: number
  failedCount: number
}

export interface SyncStatus {
  state: SyncState
  /** Nuxt UI color name for the header chip. */
  color: 'neutral' | 'info' | 'success' | 'warning'
  /** Icon shown on the profile page. Keep these literal so the offline icon bundle includes them. */
  icon: string
  /** Whether the icon should spin (the page turns this off for reduced motion). */
  spin: boolean
  /** Short status text, also used as the chip's accessible label. */
  label: string
}

function changes(count: number) {
  return `${count} change${count === 1 ? '' : 's'}`
}

/**
 * One status for the whole app, so the header chip, the profile page and the
 * banner cannot disagree. Offline wins (nothing can sync), then a running sync,
 * then failed changes (which need the user), then changes still waiting.
 * Fetching fresh data counts as a running sync: the header dot is its only sign.
 */
export function getSyncStatus({ isOffline, syncing, refreshing = false, pendingCount, failedCount }: SyncStatusInput): SyncStatus {
  if (isOffline) {
    const waiting = pendingCount + failedCount
    return {
      state: 'offline',
      color: 'neutral',
      icon: 'fa7-regular:cloud',
      spin: false,
      label: waiting ? `Offline, ${changes(waiting)} waiting to sync` : 'Offline',
    }
  }

  if (syncing || refreshing) {
    return {
      state: 'syncing',
      color: 'info',
      icon: 'fa7-solid:arrows-rotate',
      spin: true,
      label: pendingCount ? `Syncing ${changes(pendingCount)}` : 'Syncing',
    }
  }

  if (failedCount) {
    return {
      state: 'attention',
      color: 'warning',
      icon: 'fa7-solid:triangle-exclamation',
      spin: false,
      label: `${changes(failedCount)} need${failedCount === 1 ? 's' : ''} attention`,
    }
  }

  if (pendingCount) {
    return {
      state: 'syncing',
      color: 'info',
      icon: 'fa7-solid:arrows-rotate',
      spin: false,
      label: `${changes(pendingCount)} waiting to sync`,
    }
  }

  return {
    state: 'synced',
    color: 'success',
    icon: 'fa7-regular:circle-check',
    spin: false,
    label: 'All changes synced',
  }
}
