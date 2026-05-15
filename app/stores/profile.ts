import { defineStore } from 'pinia'
import { getSupabase, setHouseholdId } from '~/composables/supabase'

export interface UserProfile {
  id: string
  user_id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  avatar_link: string | null
  household_id: string | null
}

export const useProfileStore = defineStore('profile', () => {
  const profile = ref<UserProfile | null>(null)

  const isReady = computed(() => profile.value !== null)
  const householdId = computed(() => profile.value?.household_id ?? null)

  async function init() {
    const supabase = getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('Profile')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error || !data) throw new Error('No profile found for user')

    profile.value = data as UserProfile

    // Keep householdId cache in sync for composables that use resolveHouseholdId
    if (data.household_id) setHouseholdId(data.household_id)
  }

  function clear() {
    profile.value = null
    setHouseholdId(null)
  }

  return { profile, isReady, householdId, init, clear }
})
