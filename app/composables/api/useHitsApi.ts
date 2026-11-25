import { apiFetch } from '~/composables/useApiToken'
import { createOrQueueOffline, deleteOrQueueOffline, editOrQueueOffline } from '~/utils/offlineQueue.client'

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
    return createOrQueueOffline('transfer', { fromAccountId, toAccountId, amount, date })
  }

  function updateTransfer(id: string, fromAccountId: string, toAccountId: string, amount: number, date: string, existing?: Record<string, any>) {
    return editOrQueueOffline('transfer', id, { fromAccountId, toAccountId, amount, date }, existing)
  }

  function deleteTransfer(id: string) {
    return deleteOrQueueOffline('transfer', id)
  }

  function insertIncome(amount: number, date: string, entity: string, budgetId: string | null = null, accountId: string | null = null, notes: string | null = null) {
    return createOrQueueOffline('income', { amount, date, entity, budgetId, accountId, notes })
  }

  function deleteIncome(id: string) {
    return deleteOrQueueOffline('income', id)
  }

  function updateIncome(
    id: string,
    amount: number,
    date: string,
    entity: string,
    budgetId: string | null = null,
    accountId: string | null = null,
    notes?: string | null,
    existing?: Record<string, any>
  ) {
    return editOrQueueOffline('income', id, { amount, date, entity, budgetId, accountId, notes }, existing)
  }

  function createBudgetHit(
    budgetId: string | null,
    date: string,
    amount: string,
    entity: string,
    accountId: string | null = null,
    notes: string | null = null,
    tags?: string[]
  ) {
    return createOrQueueOffline('expense', { budgetId, date, amount, entity, accountId, notes, ...(tags ? { tags } : {}) })
  }

  function deleteBudgetHit(id: string) {
    return deleteOrQueueOffline('expense', id)
  }

  function updateBudgetHit(
    id: string,
    budgetId: string | null,
    date: string,
    amount: string,
    entity: string,
    accountId: string | null = null,
    notes?: string | null,
    tags?: string[],
    existing?: Record<string, any>
  ) {
    return editOrQueueOffline('expense', id, { budgetId, date, amount, entity, accountId, notes, ...(tags ? { tags } : {}) }, existing)
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
