export interface Month {
  year: number
  month: number
}

const monthIndex = ({ year, month }: Month) => year * 12 + month - 1

/**
 * The nearest month before (-1) or after (1) the given one that can be opened,
 * or null at either end. Months with data can be opened, and so can the current
 * calendar month. Months without data in between are skipped.
 */
export function adjacentMonth(
  available: Month[],
  from: Month,
  direction: -1 | 1,
  now = new Date(),
): Month | null {
  const current = { year: now.getFullYear(), month: now.getMonth() + 1 }
  let nearest: Month | null = null

  for (const candidate of [...available, current]) {
    const distance = (monthIndex(candidate) - monthIndex(from)) * direction
    if (distance <= 0) continue
    if (!nearest || distance < (monthIndex(nearest) - monthIndex(from)) * direction) {
      nearest = { year: candidate.year, month: candidate.month }
    }
  }

  return nearest
}

/** The month's name, with the year only when it is not the current one. */
export function monthPickerLabel({ year, month }: Month, now = new Date()) {
  const name = new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long' })
  return year === now.getFullYear() ? name : `${name} ${year}`
}
