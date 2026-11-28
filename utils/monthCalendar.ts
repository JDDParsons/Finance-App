import type { DailySpendingHit, DailySpendingTransaction } from './dailySpending'

export interface MonthCalendarIncome {
  date?: string | null
  amount?: number | string | null
}

export interface MonthCalendarCell {
  dateKey: string
  day: number
  isToday: boolean
  spent: number
  transactions: DailySpendingTransaction[]
  /** Income dated this day. It is planned until the day arrives, as on income cards. */
  income: { amount: number, isPlanned: boolean } | null
}

function toDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/**
 * Every day of the month in full weeks starting on Sunday, with null for the
 * blanks before the first day and after the last.
 */
export function buildMonthCalendarCells(
  year: number,
  month: number,
  hits: DailySpendingHit[],
  income: MonthCalendarIncome[],
  now = new Date(),
): Array<MonthCalendarCell | null> {
  const todayKey = toDateKey(now.getFullYear(), now.getMonth() + 1, now.getDate())
  const daysInMonth = new Date(year, month, 0).getDate()

  const days: MonthCalendarCell[] = Array.from({ length: daysInMonth }, (_, index) => {
    const dateKey = toDateKey(year, month, index + 1)
    return {
      dateKey,
      day: index + 1,
      isToday: dateKey === todayKey,
      spent: 0,
      transactions: [],
      income: null,
    }
  })
  // Rows from other months find no day and are left out.
  const byDate = new Map(days.map(cell => [cell.dateKey, cell]))
  const dayFor = (date?: string | null) => byDate.get(String(date ?? '').slice(0, 10))

  for (const hit of hits) {
    const cell = dayFor(hit.date)
    if (!cell) continue
    const amount = Number(hit.amount) || 0
    cell.spent += amount
    cell.transactions.push({
      id: hit.id ?? `${cell.dateKey}-${cell.transactions.length}`,
      amount,
      budgetId: hit.budget_id ?? null,
      entity: hit.entity ?? null,
    })
  }

  for (const row of income) {
    const cell = dayFor(row.date)
    if (!cell) continue
    cell.income = {
      amount: (cell.income?.amount ?? 0) + (Number(row.amount) || 0),
      isPlanned: cell.dateKey > todayKey,
    }
  }

  const cells: Array<MonthCalendarCell | null> = [
    ...Array(new Date(year, month - 1, 1).getDay()).fill(null),
    ...days,
  ]
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}
