import { defineStore } from 'pinia'
import { getSupabase } from '~/composables/supabase/client'
import { useProfileApi } from '~/composables/api/useProfileApi'

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
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Not authenticated')

    const { getProfile } = useProfileApi()
    const data = await getProfile()
    if (!data) throw new Error('No profile found for user')
    profile.value = data as UserProfile
  }

  function clear() {
    profile.value = null
  }

  return { profile, isReady, householdId, init, clear }
})
