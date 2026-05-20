import { parseFinanceData } from '../../utils/parse'

export default defineEventHandler(async (event) => {
  const { user, supabase } = await requireAuth(event)
  const householdId = await resolveHouseholdId(supabase, user.id)
  const { csvText, filename } = await readBody(event)

  if (!csvText || !filename) {
    throw createError({ statusCode: 400, message: 'csvText and filename are required' })
  }

  const Papa = await import('papaparse')
  const results = Papa.default.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header: string) => header.trim(),
  })

  const parsed = parseFinanceData(results.data as any[], filename)
  if (!parsed || parsed.length === 0) return { count: 0 }

  const transactions = parsed.map((it: any) => ({
    id: it.Id,
    group: it.Group,
    group_id: it.GroupId,
    amount: it.Amount,
    description: it.Description,
    transaction_date: new Date(it.TransactionDate),
    user_id: user.id,
    household_id: householdId,
  }))

  return upsertTransactions(supabase, transactions)
})
