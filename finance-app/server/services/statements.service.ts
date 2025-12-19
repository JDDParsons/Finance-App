import { prisma } from '../api/prisma'

const MONTHS: Record<string, string> = {
  JAN: 'January', FEB: 'February', MAR: 'March', APR: 'April', MAY: 'May', JUN: 'June',
  JUL: 'July', AUG: 'August', SEP: 'September', OCT: 'October', NOV: 'November', DEC: 'December'
}

function titleCaseToken(token: string) {
  // Replace underscores with spaces, lower then uppercase first letter of each word
  return token
    .replace(/_/g, ' ')
    .split(/(\s+)/)
    .map(t => t.length === 0 ? t : t[0].toUpperCase() + t.slice(1).toLowerCase())
    .join('')
}

export class StatementsService {
  /*
    Returns array of objects:
    { year: number | null, month: string | null, name: string, transactions: number, rawGroup: string }
  */
  async getGroupsWithCounts() {
    const groups = await prisma.transaction.groupBy({
      by: ['group'],
      where: { group: { not: null } },
      _count: { id: true },
      _min: { created_at: true },
    })

    const items = groups.map(g => {
      const raw = (g.group ?? '') as string

      // Expected pattern: <NAME_PARTS>_<MON_ABBR>_<YEAR>
      // Example: BMO_CHEQUING-1_OCT_2025
      const parts = raw.split('_')
      let year: number | null = null
      let month: string | null = null
      let nameParts: string[] = []

      if (parts.length >= 2) {
        const last = parts[parts.length - 1]
        const secondLast = parts[parts.length - 2]

        // Year if last is numeric
        if (/^\d{4}$/.test(last)) {
          year = Number(last)
          // month is second last if it's a 3-letter month
          const mon = secondLast.toUpperCase()
          month = MONTHS[mon] ?? null
          nameParts = parts.slice(0, parts.length - 2)
        } else {
          // If last is not year, treat everything except last as name
          nameParts = parts.slice(0, parts.length - 1)
          const mon = last.toUpperCase()
          month = MONTHS[mon] ?? null
        }
      } else {
        nameParts = parts
      }

      const rawName = nameParts.join('_')
      // Convert underscores/hyphens to nicely cased name but keep hyphens
      const name = rawName
        .split('_')
        .map(p => p.split('-').map(titleCaseToken).join('-'))
        .join(' ')

      const createdAt = g._min?.created_at ?? null

      return {
        year,
        month,
        name,
        transactions: Number(g._count?.id ?? 0),
        rawGroup: raw,
        dateUploaded: createdAt ? (createdAt as Date).toISOString() : null,
      }
    })

    // Build month name -> index map for sorting
    const MONTH_NAME_TO_INDEX: Record<string, number> = {}
    Object.values(MONTHS).forEach((m, i) => { MONTH_NAME_TO_INDEX[m] = i + 1 })

    // Sort: year desc (nulls last), then month desc (nulls last), then name asc
    items.sort((a, b) => {
      const ay = a.year ?? -9999
      const by = b.year ?? -9999
      if (by !== ay) return by - ay

      const ai = a.month ? (MONTH_NAME_TO_INDEX[a.month] ?? 0) : 0
      const bi = b.month ? (MONTH_NAME_TO_INDEX[b.month] ?? 0) : 0
      if (bi !== ai) return bi - ai

      // final tie-breaker: name ascending
      return a.name.localeCompare(b.name)
    })

    return items
  }
}
