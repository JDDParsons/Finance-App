export interface YearMonth {
  year: number
  month: number
}

export function monthStart(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}-01`
}

export function previousMonth(year: number, month: number): YearMonth {
  return month === 1
    ? { year: year - 1, month: 12 }
    : { year, month: month - 1 }
}

export function continuousMonthRange(earliestDate: string | null, now = new Date()): YearMonth[] {
  const endYear = now.getFullYear()
  const endMonth = now.getMonth() + 1
  if (!earliestDate) return [{ year: endYear, month: endMonth }]

  const [rawYear, rawMonth] = earliestDate.slice(0, 7).split('-').map(Number)
  if (!rawYear || !rawMonth || rawMonth < 1 || rawMonth > 12) {
    return [{ year: endYear, month: endMonth }]
  }

  const startIndex = rawYear * 12 + rawMonth - 1
  const endIndex = endYear * 12 + endMonth - 1
  if (startIndex > endIndex) return [{ year: endYear, month: endMonth }]

  const result: YearMonth[] = []
  for (let index = startIndex; index <= endIndex; index++) {
    result.push({ year: Math.floor(index / 12), month: (index % 12) + 1 })
  }
  return result
}
