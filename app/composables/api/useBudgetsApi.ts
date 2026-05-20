import { apiFetch } from '~/composables/useApiToken'

export function useBudgetsApi() {
  function getBudgetsByMonth(year: number, month: number) {
    return apiFetch<any[]>(`/api/budgets/by-month?year=${year}&month=${month}`)
  }

  function getAvailableBudgetMonths() {
    return apiFetch<any[]>('/api/budgets/months')
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

  function deleteBudget(id: string) {
    return apiFetch<any>(`/api/budgets/${id}`, { method: 'DELETE' })
  }

  return { getBudgetsByMonth, getAvailableBudgetMonths, createBudget, updateBudget, deleteBudget }
}
