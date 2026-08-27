import { apiFetch } from '~/composables/useApiToken'

export function useBudgetsApi() {
  function getBudgetsByMonth(year: number, month: number) {
    return apiFetch<any[]>(`/api/budgets/by-month?year=${year}&month=${month}`)
  }

  function getAvailableBudgetMonths() {
    return apiFetch<any[]>('/api/budgets/months')
  }

  function getInactiveBudgets() {
    return apiFetch<any[]>('/api/budgets/inactive')
  }

  function createBudget(name: string, amount: string, color?: string, icon?: string | null) {
    return apiFetch<any>('/api/budgets', {
      method: 'POST',
      body: { name, amount, color, icon },
    })
  }

  function updateBudget(
    id: string,
    name: string,
    amount: string,
    color?: string,
    icon?: string | null,
    year?: number,
    month?: number
  ) {
    return apiFetch<any>(`/api/budgets/${id}`, {
      method: 'PUT',
      body: { name, amount, color, icon, year, month },
    })
  }

  function deleteBudget(id: string, year: number, month: number) {
    return apiFetch<{ budgetDeleted: boolean }>(`/api/budgets/${id}?year=${year}&month=${month}`, { method: 'DELETE' })
  }

  function reactivateBudget(id: string) {
    return apiFetch<{ success: boolean }>(`/api/budgets/${id}/reactivate`, { method: 'POST' })
  }

  return {
    getBudgetsByMonth,
    getAvailableBudgetMonths,
    getInactiveBudgets,
    createBudget,
    updateBudget,
    deleteBudget,
    reactivateBudget,
  }
}
