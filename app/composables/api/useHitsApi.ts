import { apiFetch } from '~/composables/useApiToken'

export function useHitsApi() {
  function getBudgetHitsByMonth(year: number, month: number) {
    return apiFetch<any[]>(`/api/hits/by-month?year=${year}&month=${month}`)
  }

  function getIncomeByMonth(year: number, month: number) {
    return apiFetch<any[]>(`/api/income/by-month?year=${year}&month=${month}`)
  }

  function insertIncome(amount: number, date: string, note: string, accountId: string | null = null) {
    return apiFetch<any>('/api/income', {
      method: 'POST',
      body: { amount, date, note, accountId },
    })
  }

  function deleteIncome(id: string) {
    return apiFetch<any>(`/api/income/${id}`, { method: 'DELETE' })
  }

  function createBudgetHit(
    budgetId: string | null,
    date: string,
    amount: string,
    note: string,
    accountId: string | null = null
  ) {
    return apiFetch<any>('/api/hits', {
      method: 'POST',
      body: { budgetId, date, amount, note, accountId },
    })
  }

  function deleteBudgetHit(id: string) {
    return apiFetch<any>(`/api/hits/${id}`, { method: 'DELETE' })
  }

  function updateBudgetHit(
    id: string,
    budgetId: string | null,
    date: string,
    amount: string,
    note: string,
    accountId: string | null = null
  ) {
    return apiFetch<any>(`/api/hits/${id}`, {
      method: 'PUT',
      body: { budgetId, date, amount, note, accountId },
    })
  }

  function getUserProfiles(userIds: string[]) {
    const param = userIds.join(',')
    return apiFetch<any[]>(`/api/profiles?userIds=${param}`)
  }

  return {
    getBudgetHitsByMonth,
    getIncomeByMonth,
    insertIncome,
    deleteIncome,
    createBudgetHit,
    deleteBudgetHit,
    updateBudgetHit,
    getUserProfiles,
  }
}
