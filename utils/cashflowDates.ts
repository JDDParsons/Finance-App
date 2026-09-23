export interface CashflowMonth {
  year: number
  month: number
}

function isCalendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false

  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))

  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day
}

export function datesInMonth({ year, month }: CashflowMonth, today = new Date()) {
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth() + 1
  const dayCount = isCurrentMonth
    ? today.getDate()
    : new Date(Date.UTC(year, month, 0)).getUTCDate()
  const monthPart = String(month).padStart(2, '0')

  return Array.from({ length: dayCount }, (_, index) => {
    const day = dayCount - index
    return `${year}-${monthPart}-${String(day).padStart(2, '0')}`
  })
}

export function transactionDateFromQuery(value: unknown, fallback: string) {
  const candidate = Array.isArray(value) ? value[0] : value
  return typeof candidate === 'string' && isCalendarDate(candidate) ? candidate : fallback
}
