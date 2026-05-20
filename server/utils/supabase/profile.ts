import type { SupabaseClient } from '@supabase/supabase-js'

export async function resolveHouseholdId(supabase: SupabaseClient, userId: string): Promise<string> {
  const { data, error } = await supabase
    .from('Profile')
    .select('household_id')
    .eq('user_id', userId)
    .single()

  if (error || !data?.household_id) {
    throw createError({ statusCode: 404, message: 'No household found for user' })
  }

  return data.household_id as string
}

export async function getProfile(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('Profile')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error || !data) {
    throw createError({ statusCode: 404, message: 'Profile not found' })
  }

  return data
}
