import { apiFetch } from '~/composables/useApiToken'

export function useAccountsApi() {
  function getAccounts() {
    return apiFetch<any[]>('/api/accounts')
  }

  function createAccount(
    name: string,
    institution: string,
    baselineAmount: string,
    cardNumber: string,
    isCreditCard: boolean,
    isDefaultForExpenses: boolean,
    isDefaultForIncome: boolean
  ) {
    return apiFetch<any>('/api/accounts', {
      method: 'POST',
      body: { name, institution, baselineAmount, cardNumber, isCreditCard, isDefaultForExpenses, isDefaultForIncome },
    })
  }

  function updateAccount(
    id: string,
    name: string,
    institution: string,
    cardNumber: string,
    isCreditCard: boolean,
    isDefaultForExpenses: boolean,
    isDefaultForIncome: boolean
  ) {
    return apiFetch<any>(`/api/accounts/${id}`, {
      method: 'PUT',
      body: { name, institution, cardNumber, isCreditCard, isDefaultForExpenses, isDefaultForIncome },
    })
  }

  function updateAccountBaseline(id: string, baselineAmount: string) {
    return apiFetch<any>(`/api/accounts/${id}/baseline`, {
      method: 'PUT',
      body: { baselineAmount },
    })
  }

  function deleteAccount(id: string) {
    return apiFetch<any>(`/api/accounts/${id}`, { method: 'DELETE' })
  }

  return { getAccounts, createAccount, updateAccount, updateAccountBaseline, deleteAccount }
}
