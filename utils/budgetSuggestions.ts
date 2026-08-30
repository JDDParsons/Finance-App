export interface BudgetSuggestionPeriod {
  budget_id?: string | null
  date?: string | null
  amount?: number | string | null
}

export function buildBudgetAmountSuggestions(periods: BudgetSuggestionPeriod[], targetDate: string) {
  const previous = new Map<string, { date: string; amount: number }>()
  const next = new Map<string, { date: string; amount: number }>()

  for (const period of periods) {
    if (!period.budget_id || !period.date || period.date === targetDate) continue
    const suggestion = { date: period.date, amount: Number(period.amount) }

    if (period.date < targetDate) {
      const current = previous.get(period.budget_id)
      if (!current || period.date > current.date) previous.set(period.budget_id, suggestion)
    } else {
      const current = next.get(period.budget_id)
      if (!current || period.date < current.date) next.set(period.budget_id, suggestion)
    }
  }

  return new Map(
    [...new Set([...previous.keys(), ...next.keys()])]
      .map(budgetId => [budgetId, previous.get(budgetId)?.amount ?? next.get(budgetId)?.amount] as const)
  )
}
