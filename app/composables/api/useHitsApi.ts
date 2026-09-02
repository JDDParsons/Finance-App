import { apiFetch } from '~/composables/useApiToken'

export function useHitsApi() {
  type BudgetEntitiesByBudget = Record<string, string[]>

  function getBudgetHitsByMonth(year: number, month: number) {
    return apiFetch<any[]>(`/api/hits/by-month?year=${year}&month=${month}`)
  }

  function getDailySpendingAverage(year: number, month: number) {
    return apiFetch<{ dailyAverages: number[]; months: number } | null>(
      `/api/hits/daily-average?year=${year}&month=${month}`
    )
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

  function getTransfersByMonth(year: number, month: number) {
    return apiFetch<any[]>(`/api/transfers/by-month?year=${year}&month=${month}`)
  }

  function insertTransfer(fromAccountId: string, toAccountId: string, amount: number, date: string) {
    return apiFetch<any>('/api/transfers', {
      method: 'POST',
      body: { fromAccountId, toAccountId, amount, date },
    })
  }

  function updateTransfer(id: string, fromAccountId: string, toAccountId: string, amount: number, date: string) {
    return apiFetch<any>(`/api/transfers/${id}`, {
      method: 'PUT',
      body: { fromAccountId, toAccountId, amount, date },
    })
  }

  function deleteTransfer(id: string) {
    return apiFetch<{ success: boolean }>(`/api/transfers/${id}`, { method: 'DELETE' })
  }

  function insertIncome(amount: number, date: string, entity: string, budgetId: string | null = null, accountId: string | null = null, notes: string | null = null) {
    return apiFetch<any>('/api/income', {
      method: 'POST',
      body: { amount, date, entity, budgetId, accountId, notes },
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
    budgetId: string | null = null,
    accountId: string | null = null,
    notes?: string | null
  ) {
    return apiFetch<any>(`/api/income/${id}`, {
      method: 'PUT',
      body: { amount, date, entity, budgetId, accountId, notes },
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
    getDailySpendingAverage,
    getBudgetEntities,
    getBudgetEntitiesByBudgetIds,
    getIncomeByMonth,
    getTransfersByMonth,
    insertTransfer,
    updateTransfer,
    deleteTransfer,
    insertIncome,
    deleteIncome,
    updateIncome,
    createBudgetHit,
    deleteBudgetHit,
    updateBudgetHit,
    getUserProfiles,
  }
}
