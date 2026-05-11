import { getSupabase } from './client'

function getClient() {
  return getSupabase().schema('finance-app')
}

async function attachLatestCategory(transactions: any[]) {
  if (transactions.length === 0) return transactions

  const ids = transactions.map(t => t.id)
  const { data: txCats, error } = await getClient()
    .from('Transaction_Category')
    .select('transaction_id, category_id, created_at')
    .in('transaction_id', ids)
    .order('created_at', { ascending: false })

  if (error) throw error

  const latestMap = new Map<string, string>()
  for (const row of txCats || []) {
    if (row.transaction_id && !latestMap.has(row.transaction_id)) {
      latestMap.set(row.transaction_id, row.category_id)
    }
  }

  return transactions.map(t => ({ ...t, currentCategoryId: latestMap.get(t.id) || null }))
}

export async function getAllTransactionsSorted() {
  const { data, error } = await getClient()
    .from('Transaction')
    .select('*')
    .order('transaction_date', { ascending: false })

  if (error) throw error
  return attachLatestCategory(data || [])
}

export async function getTransactionsByMonth(year: number, month: number) {
  const startDate = new Date(year, month - 1, 1).toISOString()
  const endDate = new Date(year, month, 1).toISOString()

  const { data, error } = await getClient()
    .from('Transaction')
    .select('*')
    .gte('transaction_date', startDate)
    .lt('transaction_date', endDate)
    .order('transaction_date', { ascending: false })

  if (error) throw error
  return attachLatestCategory(data || [])
}

export async function setTransactionCategory(transactionId: string, categoryId: string) {
  if (!transactionId || !categoryId) throw new Error('Missing transactionId or categoryId')

  const { data: existing, error: selErr } = await getClient()
    .from('Transaction_Category')
    .select('*')
    .eq('transaction_id', transactionId)
    .maybeSingle()

  if (selErr) throw selErr

  if (existing) {
    const { data, error } = await getClient()
      .from('Transaction_Category')
      .update({ category_id: categoryId } as any)
      .eq('id', existing.id)
      .select()
      .single()
    if (error) throw error
    return data
  }

  const { data, error } = await getClient()
    .from('Transaction_Category')
    .insert({ transaction_id: transactionId, category_id: categoryId } as any)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function upsertTransactions(
  transactions: Array<{
    id: string
    group: string | null
    group_id: number | null
    amount: number | null
    description: string
    transaction_date: Date | string
    user_id: string | null | undefined
  }>
) {
  const { count, error } = await getTransactionClient()
    .from('Transaction')
    .upsert(transactions as any, { onConflict: 'id', count: 'exact' })

  if (error) throw error
  return { count }
}

export async function deleteTransactionsByGroup(group: string) {
  const { error } = await getTransactionClient()
    .from('Transaction')
    .delete()
    .eq('group', group)

  if (error) throw error
}
