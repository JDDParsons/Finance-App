import { defineStore } from 'pinia'
import {
  getAccounts,
  createAccount,
  updateAccount,
  updateAccountBaseline,
  deleteAccount,
} from '~/composables/supabase'

export const useAccountsStore = defineStore('accounts', () => {
  const accounts = ref<any[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const initialized = ref(false)

  async function fetchAccounts(force = false) {
    if (initialized.value && !force) return

    loading.value = true
    error.value = null
    try {
      accounts.value = await getAccounts()
      initialized.value = true
    } catch (e: any) {
      error.value = e?.message || 'Failed to load accounts.'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function ensureLoaded() {
    await fetchAccounts(false)
  }

  async function addAccount(
    name: string,
    institution: string,
    baselineAmount: string,
    cardNumber: string,
    isCreditCard: boolean,
    isDefaultForExpenses: boolean,
    isDefaultForIncome: boolean
  ) {
    const row = await createAccount(
      name,
      institution,
      baselineAmount,
      cardNumber,
      isCreditCard,
      isDefaultForExpenses,
      isDefaultForIncome
    )
    accounts.value = [row, ...accounts.value]
    initialized.value = true
    return row
  }

  async function editAccount(
    id: string,
    name: string,
    institution: string,
    cardNumber: string,
    isCreditCard: boolean,
    isDefaultForExpenses: boolean,
    isDefaultForIncome: boolean
  ) {
    const row = await updateAccount(
      id,
      name,
      institution,
      cardNumber,
      isCreditCard,
      isDefaultForExpenses,
      isDefaultForIncome
    )
    accounts.value = accounts.value.map(a => (a.id === id ? row : a))
    return row
  }

  async function editAccountBaseline(id: string, baselineAmount: string) {
    const valueRow = await updateAccountBaseline(id, baselineAmount)
    const updated = accounts.value.map(a => (
      a.id === id
        ? {
            ...a,
            baseline_amount: valueRow.baseline_amount,
            cumulative_amount: valueRow.cumulative_amount,
          }
        : a
    ))
    accounts.value = updated
    return updated.find(a => a.id === id) ?? null
  }

  async function removeAccount(id: string) {
    await deleteAccount(id)
    accounts.value = accounts.value.filter(a => a.id !== id)
  }

  return {
    accounts,
    loading,
    error,
    initialized,
    fetchAccounts,
    ensureLoaded,
    addAccount,
    editAccount,
    editAccountBaseline,
    removeAccount,
  }
})