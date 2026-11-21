import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// One shared client. Several clients sharing one login can each try to refresh
// the same token at the same time; refresh tokens rotate, so a race can end the session.
let client: SupabaseClient | null = null

export function getSupabase() {
  if (!client) {
    const config = useRuntimeConfig()
    client = createClient(
      config.public.supabaseUrl,
      config.public.supabaseAnonKey
    )
  }
  return client
}
