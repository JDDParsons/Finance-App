import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const { email } = await readBody(event)

  if (!email) {
    throw createError({ statusCode: 400, message: 'Email is required.' })
  }

  const config = useRuntimeConfig()
  const supabase = createClient(config.public.supabaseUrl, config.supabaseServiceRoleKey)

  // Check authorization server-side — service role key can read auth.users via RPC
  const { data: authorized, error: rpcError } = await supabase.rpc('is_authorized_email', { email_to_check: email })
  if (rpcError) {
    throw createError({ statusCode: 500, message: 'Authorization check failed.' })
  }

  if (!authorized) {
    throw createError({ statusCode: 403, message: 'This email is not authorized to access Budgify.' })
  }

  // shouldCreateUser: false is a safety net — Supabase will not create new accounts
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false },
  })

  if (error) {
    throw createError({ statusCode: 500, message: 'Error sending verification code: ' + error.message })
  }

  return { success: true }
})
