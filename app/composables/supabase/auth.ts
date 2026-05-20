import { getSupabase, setHouseholdId } from './client'

export async function sendMagicLink(email: string): Promise<{ success: boolean; message: string }> {
  try {
    await $fetch('/api/auth/send-code', { method: 'POST', body: { email } })
    return { success: true, message: 'Verification code sent! Please check your email.' }
  } catch (err: any) {
    const message = err?.data?.message || err?.message || 'Unknown error'
    return { success: false, message }
  }
}

export async function validateCode(email: string, code: string) {
  try {
    const supabase = getSupabase()
    const { data: { session }, error } = await supabase.auth.verifyOtp({
      email: email,
      token: code,
      type: 'email',
    })
    return { session, error }
  } catch (err: any) {
    console.error('Error validating code:', err)
    throw new Error('Invalid code or error during validation.')
  }
}

export async function getSession() {
  const supabase = getSupabase()
  const { data: auth } = await supabase.auth.getSession()
  return auth.session
}

export async function signOut() {
  const supabase = getSupabase()
  const { error } = await supabase.auth.signOut()
  if (error) throw error
  setHouseholdId(null)
  await navigateTo('/')
}
