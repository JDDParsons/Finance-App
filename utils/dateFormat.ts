function ordinalSuffix(day: number) {
  const lastTwoDigits = day % 100

  if (lastTwoDigits >= 11 && lastTwoDigits <= 13) return 'th'

  switch (day % 10) {
    case 1: return 'st'
    case 2: return 'nd'
    case 3: return 'rd'
    default: return 'th'
  }
}

export function formatWeekdayOrdinal(date: Date) {
  const weekday = date.toLocaleDateString('en-US', { weekday: 'long' })
  const day = date.getDate()

  return `${weekday} the ${day}${ordinalSuffix(day)}`
}

export function formatDashboardPeriodLabel(year: number, month: number, today = new Date()) {
  const monthDifference = (today.getFullYear() - year) * 12 + (today.getMonth() + 1 - month)

  if (monthDifference === 1) return 'Last month'
  if (monthDifference > 1) return `${monthDifference} months ago`

  return formatWeekdayOrdinal(today)
}
