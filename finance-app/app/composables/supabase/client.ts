import { createClient } from '@supabase/supabase-js'

export function getSupabase() {
  const config = useRuntimeConfig()
  return createClient(
    config.public.supabaseUrl,
    config.public.supabaseAnonKey
  )
}

// --- Household ID cache ---
let _householdId: string | null = null

export function setHouseholdId(id: string | null) {
  _householdId = id
}

export function getCachedHouseholdId(): string | null {
  return _householdId
}

export async function resolveHouseholdId(): Promise<string> {
  if (_householdId) return _householdId
  const supabase = getSupabase()
  const { data: auth } = await supabase.auth.getSession()
  const userId = auth.session?.user?.id
  if (!userId) throw new Error('Not authenticated')
  const { data, error } = await supabase
    .from('Household_Member')
    .select('household_id')
    .eq('user_id', userId)
    .single()
  if (error || !data?.household_id) throw new Error('No household found for user')
  _householdId = data.household_id as string
  return _householdId
}
