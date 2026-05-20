import type { SupabaseClient } from '@supabase/supabase-js'

function getClient(supabase: SupabaseClient) {
  return supabase.schema('finance-app')
}

async function attachLatestCategory(supabase: SupabaseClient, transactions: any[]) {
  if (transactions.length === 0) return transactions

  const ids = transactions.map(t => t.id)
  const { data: txCats, error } = await getClient(supabase)
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

export async function getCategories(supabase: SupabaseClient) {
  const { data, error } = await getClient(supabase)
    .from('Category')
    .select('id, label')
    .order('label', { ascending: true })

  if (error) throw error
  return (data || []).map((c: any) => ({ id: c.id, label: c.label }))
}

export async function getAllTransactionsSorted(supabase: SupabaseClient) {
  const { data, error } = await getClient(supabase)
    .from('Transaction')
    .select('*')
    .order('transaction_date', { ascending: false })

  if (error) throw error
  return attachLatestCategory(supabase, data || [])
}

export async function getTransactionsByMonth(supabase: SupabaseClient, year: number, month: number) {
  const startDate = new Date(year, month - 1, 1).toISOString()
  const endDate = new Date(year, month, 1).toISOString()

  const { data, error } = await getClient(supabase)
    .from('Transaction')
    .select('*')
    .gte('transaction_date', startDate)
    .lt('transaction_date', endDate)
    .order('transaction_date', { ascending: false })

  if (error) throw error
  return attachLatestCategory(supabase, data || [])
}

export async function setTransactionCategory(
  supabase: SupabaseClient,
  transactionId: string,
  categoryId: string
) {
  if (!transactionId || !categoryId) throw createError({ statusCode: 400, message: 'Missing transactionId or categoryId' })

  const { data: existing, error: selErr } = await getClient(supabase)
    .from('Transaction_Category')
    .select('*')
    .eq('transaction_id', transactionId)
    .maybeSingle()

  if (selErr) throw selErr

  if (existing) {
    const { data, error } = await getClient(supabase)
      .from('Transaction_Category')
      .update({ category_id: categoryId } as any)
      .eq('id', existing.id)
      .select()
      .single()
    if (error) throw error
    return data
  }

  const { data, error } = await getClient(supabase)
    .from('Transaction_Category')
    .insert({ transaction_id: transactionId, category_id: categoryId } as any)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function upsertTransactions(
  supabase: SupabaseClient,
  transactions: Array<{
    id: string
    group: string | null
    group_id: number | null
    amount: number | null
    description: string
    transaction_date: Date | string
    user_id: string | null | undefined
    household_id: string | null | undefined
  }>
) {
  const { count, error } = await getClient(supabase)
    .from('Transaction')
    .upsert(transactions as any, { onConflict: 'id', count: 'exact' })

  if (error) throw error
  return { count }
}

export async function deleteTransactionsByGroup(supabase: SupabaseClient, group: string) {
  const { error } = await getClient(supabase)
    .from('Transaction')
    .delete()
    .eq('group', group)

  if (error) throw error
}
