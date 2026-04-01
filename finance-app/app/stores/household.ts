import { defineStore } from 'pinia'
import { resolveHouseholdId, setHouseholdId } from '~/composables/supabase'

export const useHouseholdStore = defineStore('household', {
  state: () => ({
    householdId: null as string | null,
  }),

  getters: {
    isReady: (state) => state.householdId !== null,
  },

  actions: {
    async init() {
      const id = await resolveHouseholdId()
      this.householdId = id
    },

    clear() {
      this.householdId = null
      setHouseholdId(null)
    },
  },
})
