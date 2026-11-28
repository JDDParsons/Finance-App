export interface DailySpendingHit {
  id?: string | null
  date?: string | null
  amount?: number | string | null
  budget_id?: string | null
  entity?: string | null
}

export interface DailySpendingTransaction {
  id: string
  amount: number
  budgetId: string | null
  entity: string | null
}

export interface DailySpendingCell {
  dateKey: string
  amount: number
  budgetRatio: number
  transactions: DailySpendingTransaction[]
  startsNewMonth: boolean
}

const COLOR_STOPS = [
  { ratio: 0, hue: 120 },
  { ratio: 1, hue: 50 },
  { ratio: 2, hue: 28 },
  { ratio: 3, hue: 0 },
]

export function dailySpendingColors(amount: number, dailyBudgetedIncome: number) {
  const ratio = dailyBudgetedIncome > 0
    ? Math.max(amount, 0) / dailyBudgetedIncome
    : amount > 0 ? 3 : 0
  const clampedRatio = Math.min(ratio, 3)
  const upperIndex = Math.min(Math.ceil(clampedRatio), COLOR_STOPS.length - 1)
  const lowerIndex = Math.max(upperIndex - 1, 0)
  const lower = COLOR_STOPS[lowerIndex]
  const upper = COLOR_STOPS[upperIndex]
  const progress = upper.ratio === lower.ratio
    ? 0
    : (clampedRatio - lower.ratio) / (upper.ratio - lower.ratio)
  const hue = lower.hue + ((upper.hue - lower.hue) * progress)

  return {
    ratio,
    backgroundColor: `hsl(${hue} 75% 78%)`,
    borderColor: `hsl(${hue} 75% 88%)`,
  }
}

function localDateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

export function buildDailySpendingCells(
  year: number,
  month: number,
  hits: DailySpendingHit[],
  dailyBudgetedIncome: number,
  now = new Date(),
): DailySpendingCell[] {
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1
  const endDate = isCurrentMonth
    ? new Date(year, month - 1, now.getDate())
    : new Date(year, month, 0)

  const totals = new Map<string, number>()
  const transactions = new Map<string, DailySpendingTransaction[]>()
  for (const hit of hits) {
    const dateKey = String(hit.date ?? '').slice(0, 10)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) continue
    const amount = Number(hit.amount) || 0
    totals.set(dateKey, (totals.get(dateKey) ?? 0) + amount)
    const dayTransactions = transactions.get(dateKey) ?? []
    dayTransactions.push({
      id: hit.id ?? `${dateKey}-${dayTransactions.length}`,
      amount,
      budgetId: hit.budget_id ?? null,
      entity: hit.entity ?? null,
    })
    transactions.set(dateKey, dayTransactions)
  }

  return Array.from({ length: 31 }, (_, index) => {
    const date = new Date(endDate)
    date.setDate(endDate.getDate() - (30 - index))
    const dateKey = localDateKey(date)
    const amount = totals.get(dateKey) ?? 0
    const { ratio } = dailySpendingColors(amount, dailyBudgetedIncome)

    return {
      dateKey,
      amount,
      budgetRatio: ratio,
      transactions: transactions.get(dateKey) ?? [],
      startsNewMonth: index > 0 && date.getDate() === 1,
    }
  })
}
