import { createClient } from '@supabase/supabase-js'

export function getSupabase() {
  const config = useRuntimeConfig()
  return createClient(
    config.public.supabaseUrl,
    config.public.supabaseAnonKey
  )
}
