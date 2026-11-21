import { getSupabase } from './client'
import { clearSavedUserId, saveUserId } from './session'
import { clearOfflineFinanceCache } from '~/utils/offlineFinanceCache.client'
import { useProfileStore } from '~/stores/profile'
import { useAccountsStore } from '~/stores/accounts'
import { useFinanceStore } from '~/stores/finance'
import { useSavingsStore } from '~/stores/savings'

export async function validateCode(email: string, code: string) {
  try {
    const supabase = getSupabase()
    const { data: { session }, error } = await supabase.auth.verifyOtp({
      email: email,
      token: code,
      type: 'email',
    })
    if (session?.user?.id) saveUserId(session.user.id)
    return { session, error }
  } catch (err: any) {
    console.error('Error validating code:', err)
    throw new Error('Invalid code or error during validation.')
  }
}

export async function signOut() {
  const supabase = getSupabase()
  await clearOfflineFinanceCache()
  clearSavedUserId()
  useProfileStore().clear()
  useAccountsStore().clear()
  useFinanceStore().clear()
  useSavingsStore().invalidateCache()
  clearNuxtState()
  const { error } = await supabase.auth.signOut()
  if (error) throw error
  await navigateTo('/')
}
