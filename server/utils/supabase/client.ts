import { createClient } from '@supabase/supabase-js'
import type { H3Event } from 'h3'

/**
 * Creates a user-scoped Supabase client using the anon key + the user's JWT.
 * RLS policies apply normally — the server acts on behalf of the authenticated user.
 */
export function useUserSupabase(event: H3Event) {
  const config = useRuntimeConfig()
  const authorization = getHeader(event, 'authorization') ?? ''
  const token = authorization.replace(/^Bearer\s+/i, '')

  return createClient(config.public.supabaseUrl, config.public.supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}
