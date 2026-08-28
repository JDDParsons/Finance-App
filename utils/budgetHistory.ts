export interface BudgetHistorySourceRow {
  budget_id?: string | null
  date?: string | null
  amount?: number | string | null
}

export interface BudgetHistoryPoint {
  month: string
  spent: number
  budgeted: number
}

function nextMonth(month: string) {
  const [year, monthNumber] = month.split('-').map(Number)
  return new Date(Date.UTC(year, monthNumber, 1)).toISOString().slice(0, 7)
}

function fillHistoryGaps(history: Map<string, BudgetHistoryPoint>) {
  const months = [...history.keys()].sort()
  const firstMonth = months[0]
  const lastMonth = months.at(-1)
  if (!firstMonth || !lastMonth) return []

  const result: BudgetHistoryPoint[] = []
  for (let month = firstMonth; month <= lastMonth; month = nextMonth(month)) {
    result.push(history.get(month) ?? { month, spent: 0, budgeted: 0 })
  }
  return result
}

export function buildBudgetHistory(
  periods: BudgetHistorySourceRow[],
  hits: BudgetHistorySourceRow[],
  startDate: string,
  endDate: string
) {
  const historyByBudget = new Map<string, Map<string, BudgetHistoryPoint>>()

  function pointFor(budgetId: string, month: string) {
    const budgetHistory = historyByBudget.get(budgetId) ?? new Map<string, BudgetHistoryPoint>()
    const point = budgetHistory.get(month) ?? { month, spent: 0, budgeted: 0 }
    budgetHistory.set(month, point)
    historyByBudget.set(budgetId, budgetHistory)
    return point
  }

  for (const period of periods) {
    if (!period.budget_id || !period.date || period.date < startDate || period.date >= endDate) continue
    const month = period.date.slice(0, 7)
    pointFor(period.budget_id, month).budgeted = Number(period.amount) || 0
  }

  for (const hit of hits) {
    if (!hit.budget_id || !hit.date || hit.date < startDate || hit.date >= endDate) continue
    const month = hit.date.slice(0, 7)
    const point = pointFor(hit.budget_id, month)
    point.spent += Number(hit.amount) || 0
  }

  return new Map(
    [...historyByBudget].map(([budgetId, history]) => [
      budgetId,
      fillHistoryGaps(history),
    ])
  )
}
