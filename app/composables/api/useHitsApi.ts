import { apiFetch } from '~/composables/useApiToken'

export function useHitsApi() {
  type BudgetEntitiesByBudget = Record<string, string[]>

  function getBudgetHitsByMonth(year: number, month: number) {
    return apiFetch<any[]>(`/api/hits/by-month?year=${year}&month=${month}`)
  }

  function getBudgetEntities(budgetId: string) {
    return apiFetch<BudgetEntitiesByBudget>(`/api/hits/entities?budgetId=${budgetId}`)
  }

  function getBudgetEntitiesByBudgetIds(budgetIds: string[]) {
    const param = encodeURIComponent(budgetIds.join(','))
    return apiFetch<BudgetEntitiesByBudget>(`/api/hits/entities?budgetIds=${param}`)
  }

  function getIncomeByMonth(year: number, month: number) {
    return apiFetch<any[]>(`/api/income/by-month?year=${year}&month=${month}`)
  }

  function insertIncome(amount: number, date: string, entity: string, accountId: string | null = null, notes: string | null = null) {
    return apiFetch<any>('/api/income', {
      method: 'POST',
      body: { amount, date, entity, accountId, notes },
    })
  }

  function deleteIncome(id: string) {
    return apiFetch<any>(`/api/income/${id}`, { method: 'DELETE' })
  }

  function updateIncome(
    id: string,
    amount: number,
    date: string,
    entity: string,
    accountId: string | null = null,
    notes?: string | null
  ) {
    return apiFetch<any>(`/api/income/${id}`, {
      method: 'PUT',
      body: { amount, date, entity, accountId, notes },
    })
  }

  function createBudgetHit(
    budgetId: string | null,
    date: string,
    amount: string,
    entity: string,
    accountId: string | null = null,
    notes: string | null = null
  ) {
    return apiFetch<any>('/api/hits', {
      method: 'POST',
      body: { budgetId, date, amount, entity, accountId, notes },
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
    entity: string,
    accountId: string | null = null,
    notes?: string | null
  ) {
    return apiFetch<any>(`/api/hits/${id}`, {
      method: 'PUT',
      body: { budgetId, date, amount, entity, accountId, notes },
    })
  }

  function getUserProfiles(userIds: string[]) {
    const param = userIds.join(',')
    return apiFetch<any[]>(`/api/profiles?userIds=${param}`)
  }

  return {
    getBudgetHitsByMonth,
    getBudgetEntities,
    getBudgetEntitiesByBudgetIds,
    getIncomeByMonth,
    insertIncome,
    deleteIncome,
    updateIncome,
    createBudgetHit,
    deleteBudgetHit,
    updateBudgetHit,
    getUserProfiles,
  }
}
