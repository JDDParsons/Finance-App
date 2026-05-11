import Papa from 'papaparse'
import { getSupabase, resolveHouseholdId } from './client'
import { upsertTransactions } from './transactions'

// Fetch categories ordered by label
export async function getCategories() {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('Category')
    .select('id,label')
    .order('label', { ascending: true })

  if (error) throw error

  return (data || []).map((c: any) => ({ id: c.id, label: c.label }))
}

// Get statement groups and transform/sort
export async function getStatementGroups() {
  const supabase = getSupabase()
  const { data: groups, error } = await supabase
    .from('Transaction_Groups')
    .select('*')

  if (error) throw error

  const MONTHS: Record<string, string> = {
    JAN: 'January', FEB: 'February', MAR: 'March', APR: 'April', MAY: 'May', JUN: 'June',
    JUL: 'July', AUG: 'August', SEP: 'September', OCT: 'October', NOV: 'November', DEC: 'December'
  }

  function titleCaseToken(token: string): string {
    return token
      .replace(/_/g, ' ')
      .split(/(\s+)/)
      .map((t: string | undefined) => {
        const s = t ?? ''
        return s.length === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
      })
      .join('')
  }

  const items: Array<{ year: number | null; month: string | null; name: string; transactions: number; rawGroup: string; dateUploaded: string | null }> = (groups || []).map((g: any) => {
    const raw = (g.group ?? '') as string

    const parts = raw.split('_')
    let year: number | null = null
    let month: string | null = null
    let nameParts: string[] = []

    if (parts.length >= 2) {
      const last = parts[parts.length - 1] ?? ''
      const secondLast = parts[parts.length - 2] ?? ''

      if (/^\d{4}$/.test(last)) {
        year = Number(last)
        const mon = secondLast.toUpperCase()
        month = MONTHS[mon] ?? null
        nameParts = parts.slice(0, parts.length - 2)
      } else {
        nameParts = parts.slice(0, parts.length - 1)
        const mon = last.toUpperCase()
        month = MONTHS[mon] ?? null
      }
    } else {
      nameParts = parts
    }

    const rawName = nameParts.join('_')
    const name = rawName
      .split('_')
      .map(p => p.split('-').map(titleCaseToken).join('-'))
      .join(' ')

    const createdAt = g.first_created_at ?? null
    return {
      year,
      month,
      name,
      transactions: Number(g.id_count ?? 0),
      rawGroup: raw,
      dateUploaded: createdAt ? (new Date(createdAt)).toISOString() : null,
    }
  })

  const MONTH_NAME_TO_INDEX: Record<string, number> = {}
  Object.values(MONTHS).forEach((m, i) => { MONTH_NAME_TO_INDEX[m] = i + 1 })

  items.sort((a, b) => {
    const ay = a.year ?? -9999
    const by = b.year ?? -9999
    if (by !== ay) return by - ay

    const ai = a.month ? (MONTH_NAME_TO_INDEX[a.month] ?? 0) : 0
    const bi = b.month ? (MONTH_NAME_TO_INDEX[b.month] ?? 0) : 0
    if (bi !== ai) return bi - ai

    return a.name.localeCompare(b.name)
  })

  return items
}

// Upsert a transaction category (create or update) — moved to transactions.ts

// Upload a CSV file (read in browser, parse and insert transactions)
export async function uploadFile(file: File) {
  const supabase = getSupabase()
  const text = await file.text()

  const results = Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  })

  const records = results.data

  const { parseFinanceData } = await import('../../../utils/parse')
  const parsed = parseFinanceData(records as any[], file.name)

  if (!parsed || parsed.length === 0) return { count: 0 }

  const { data: auth } = await supabase.auth.getSession()
  const householdId = await resolveHouseholdId()

  const data = parsed.map((it: any) => ({
    id: it.Id,
    group: it.Group,
    group_id: it.GroupId,
    amount: it.Amount,
    description: it.Description,
    transaction_date: new Date(it.TransactionDate),
    user_id: auth.session?.user?.id,
    household_id: householdId
  }))

  return await upsertTransactions(data)
}
