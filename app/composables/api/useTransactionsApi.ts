import { apiFetch } from '~/composables/useApiToken'

export function useTransactionsApi() {
  function getAllTransactionsSorted() {
    return apiFetch<any[]>('/api/transactions')
  }

  function getTransactionsByMonth(year: number, month: number) {
    return apiFetch<any[]>(`/api/transactions?year=${year}&month=${month}`)
  }

  function getCategories() {
    return apiFetch<any[]>('/api/transactions/categories')
  }

  function setTransactionCategory(transactionId: string, categoryId: string) {
    return apiFetch<any>(`/api/transactions/${transactionId}/category`, {
      method: 'PUT',
      body: { categoryId },
    })
  }

  function deleteTransactionsByGroup(group: string) {
    return apiFetch<any>(`/api/transactions/group/${encodeURIComponent(group)}`, { method: 'DELETE' })
  }

  return {
    getAllTransactionsSorted,
    getTransactionsByMonth,
    getCategories,
    setTransactionCategory,
    deleteTransactionsByGroup,
  }
}
