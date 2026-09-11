import { signOut } from '~/composables/supabase'

export function useSignOut() {
  const appData = useAppData()

  async function handleSignOut() {
    const unsynced = appData.pendingSyncCount.value + appData.failedSyncCount.value
    const message = unsynced
      ? `Signing out will permanently discard ${unsynced} unsynced change${unsynced === 1 ? '' : 's'}. Continue?`
      : 'Are you sure you want to sign out?'
    if (!window.confirm(message)) return
    await signOut()
  }

  return { handleSignOut }
}
