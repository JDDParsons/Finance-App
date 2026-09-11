export interface SavingsRow {
  date: string
  amount: number | string | null
  type: 'Expense' | 'Income' | string
}

export interface MonthlySavingsTotal {
  year: number
  month: number
  income: number
  expenses: number
}

function offsetMonth(year: number, month: number, offset: number) {
  const date = new Date(Date.UTC(year, month - 1 + offset, 1))
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 }
}

export function buildTrailingSavingsTotals(
  rows: SavingsRow[],
  year: number,
  month: number,
  count = 12
): MonthlySavingsTotal[] {
  const totals = new Map<string, { income: number; expenses: number }>()

  for (const row of rows) {
    const key = String(row.date).slice(0, 7)
    const entry = totals.get(key) ?? { income: 0, expenses: 0 }
    const amount = Number(row.amount) || 0
    if (row.type === 'Income') entry.income += amount
    if (row.type === 'Expense') entry.expenses += amount
    totals.set(key, entry)
  }

  return Array.from({ length: count }, (_, index) => {
    const target = offsetMonth(year, month, -index)
    const key = `${target.year}-${String(target.month).padStart(2, '0')}`
    return { ...target, ...(totals.get(key) ?? { income: 0, expenses: 0 }) }
  })
}
