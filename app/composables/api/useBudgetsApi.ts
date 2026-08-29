import { apiFetch } from '~/composables/useApiToken'

export function useBudgetsApi() {
  function getBudgetsByMonth(year: number, month: number) {
    return apiFetch<any[]>(`/api/budgets/by-month?year=${year}&month=${month}`)
  }

  function getAvailableBudgetMonths() {
    return apiFetch<any[]>('/api/budgets/months')
  }

  function getAvailableBudgets(year: number, month: number) {
    return apiFetch<any[]>(`/api/budgets/available?year=${year}&month=${month}`)
  }

  function createBudget(name: string, amount: string, color: string | undefined, icon: string | null | undefined, year: number, month: number) {
    return apiFetch<any>('/api/budgets', {
      method: 'POST',
      body: { name, amount, color, icon, year, month },
    })
  }

  function updateBudgetMetadata(id: string, name: string, color?: string, icon?: string | null) {
    return apiFetch<any>(`/api/budgets/${id}`, {
      method: 'PUT',
      body: { name, color, icon },
    })
  }

  function createBudgetPeriod(id: string, amount: string, year: number, month: number) {
    return apiFetch<any>(`/api/budgets/${id}/period`, { method: 'POST', body: { amount, year, month } })
  }

  function createBudgetPeriods(budgets: Array<{ id: string; amount: string }>, year: number, month: number) {
    return apiFetch<{ createdCount: number }>('/api/budgets/periods', {
      method: 'POST', body: { budgets, year, month },
    })
  }

  function updateBudgetPeriod(id: string, amount: string, year: number, month: number) {
    return apiFetch<any>(`/api/budgets/${id}/period`, { method: 'PUT', body: { amount, year, month } })
  }

  function deleteBudget(id: string, year: number, month: number) {
    return apiFetch<{ success: boolean }>(`/api/budgets/${id}?year=${year}&month=${month}`, { method: 'DELETE' })
  }

  function getCopyPreviousPreview(year: number, month: number) {
    return apiFetch<any>(`/api/budgets/copy-preview?year=${year}&month=${month}`)
  }

  function copyPreviousBudgets(year: number, month: number) {
    return apiFetch<{ copiedCount: number; skippedCount: number; sourceCount: number }>('/api/budgets/copy-previous', {
      method: 'POST', body: { year, month },
    })
  }

  return {
    getBudgetsByMonth,
    getAvailableBudgetMonths,
    getAvailableBudgets,
    createBudget,
    createBudgetPeriod,
    createBudgetPeriods,
    updateBudgetPeriod,
    updateBudgetMetadata,
    deleteBudget,
    getCopyPreviousPreview,
    copyPreviousBudgets,
  }
}
