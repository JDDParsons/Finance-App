import Papa from 'papaparse'
import { getSupabase, resolveHouseholdId } from './client'
import { upsertTransactions } from './transactions'

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
