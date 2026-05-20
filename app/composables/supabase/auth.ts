import { getSupabase, setHouseholdId } from './client'

export async function isAuthorizedEmail(email: string): Promise<boolean> {
  const supabase = getSupabase()
  const { data, error } = await supabase.rpc('is_authorized_email', { email_to_check: email })
  if (error) throw new Error(error.message)
  return data === true
}

export async function sendMagicLink(email: string): Promise<{ success: boolean; message: string }> {
  try {
    if (!email) {
      return { success: false, message: 'Please enter a valid email address.' }
    }

    const supabase = getSupabase()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: typeof window !== 'undefined' ? window.location.href : ''
      }
    })

    if (error) {
      return { success: false, message: 'Error sending verification code: ' + error.message }
    }

    return { success: true, message: 'Verification code sent! Please check your email.' }
  } catch (err: any) {
    return { success: false, message: 'Error: ' + (err?.message || 'Unknown error') }
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
