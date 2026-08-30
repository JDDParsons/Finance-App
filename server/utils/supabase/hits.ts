import type { SupabaseClient } from '@supabase/supabase-js'
import { throwBudgetSupabaseError } from './budget-errors'

function getClient(supabase: SupabaseClient) {
  return supabase.schema('finance-app')
}

export async function createBudgetHit(
  supabase: SupabaseClient,
  userId: string,
  householdId: string,
  budgetId: string | null,
  date: string,
  amount: string,
  entity: string,
  accountId: string | null = null,
  notes: string | null = null
) {
  const { data, error } = await getClient(supabase)
    .from('Budget_Hit')
    .insert({
      budget_id: budgetId,
      date,
      amount: parseFloat(amount),
      entity,
      notes,
      type: 'Expense',
      account_id: accountId,
      user_id: userId,
      household_id: householdId,
    })
    .select()
    .single()

  if (error) {
    if (error.code === 'P0003' || error.code === 'P0004') throwBudgetSupabaseError(error, 'create an expense')
    throw error
  }
  return data
}

export async function getBudgetHits(supabase: SupabaseClient) {
  const { data: hits, error } = await getClient(supabase)
    .from('Budget_Hit')
    .select('*')
    .eq('type', 'Expense')
    .order('date', { ascending: false })

  if (error) throw error
  return hits || []
}

export async function getBudgetHitsByBudgetId(supabase: SupabaseClient, budgetId: string) {
  const { data: hits, error } = await getClient(supabase)
    .from('Budget_Hit')
    .select('*')
    .eq('budget_id', budgetId)
    .eq('type', 'Expense')
    .order('date', { ascending: false })

  if (error) throw error
  return hits || []
}

export async function deleteBudgetHit(supabase: SupabaseClient, id: string) {
  const { error } = await getClient(supabase)
    .from('Budget_Hit')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function updateBudgetHit(
  supabase: SupabaseClient,
  id: string,
  budgetId: string | null,
  date: string,
  amount: string,
  entity: string,
  accountId: string | null = null,
  notes?: string | null
) {
  const updatePayload: Record<string, unknown> = {
    budget_id: budgetId,
    date,
    amount: parseFloat(amount),
    entity,
    account_id: accountId,
  }

  if (typeof notes !== 'undefined') {
    updatePayload.notes = notes
  }

  const { data, error } = await getClient(supabase)
    .from('Budget_Hit')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    if (error.code === 'P0003' || error.code === 'P0004') throwBudgetSupabaseError(error, 'update an expense')
    throw error
  }
  return data
}

export async function getIncome(supabase: SupabaseClient, householdId: string) {
  const { data, error } = await getClient(supabase)
    .from('Budget_Hit')
    .select('*')
    .eq('type', 'Income')
    .eq('household_id', householdId)
    .order('date', { ascending: false })

  if (error) throw error
  return data || []
}

export async function insertIncome(
  supabase: SupabaseClient,
  userId: string,
  householdId: string,
  amount: number,
  date: string,
  entity: string,
  budgetId: string | null = null,
  accountId: string | null = null,
  notes: string | null = null
) {
  const { data, error } = await getClient(supabase)
    .from('Budget_Hit')
    .insert({
      amount,
      date,
      entity,
      notes,
      type: 'Income',
      budget_id: budgetId,
      account_id: accountId,
      user_id: userId,
      household_id: householdId,
    })
    .select()
    .single()

  if (error) {
    if (error.code === 'P0003' || error.code === 'P0004') throwBudgetSupabaseError(error, 'create income')
    throw error
  }
  return data
}

export async function updateIncome(
  supabase: SupabaseClient,
  id: string,
  amount: number,
  date: string,
  entity: string,
  budgetId: string | null = null,
  accountId: string | null = null,
  notes?: string | null
) {
  const updatePayload: Record<string, unknown> = {
    amount,
    date,
    entity,
    budget_id: budgetId,
    account_id: accountId,
  }

  if (typeof notes !== 'undefined') {
    updatePayload.notes = notes
  }

  const { data, error } = await getClient(supabase)
    .from('Budget_Hit')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    if (error.code === 'P0003' || error.code === 'P0004') throwBudgetSupabaseError(error, 'update income')
    throw error
  }
  return data
}

export async function deleteIncome(supabase: SupabaseClient, id: string) {
  const { error } = await getClient(supabase)
    .from('Budget_Hit')
    .delete()
    .eq('id', id)

  if (error) throw error
}

function collectDistinctEntities(rows: Array<{ budget_id?: string | null; entity?: string | null }>) {
  const seenByBudget = new Map<string, Set<string>>()
  const entitiesByBudget = new Map<string, string[]>()

  for (const row of rows) {
    const budgetId = row.budget_id ?? null
    const entity = row.entity?.trim()

    if (!budgetId || !entity) continue

    if (!seenByBudget.has(budgetId)) {
      seenByBudget.set(budgetId, new Set())
      entitiesByBudget.set(budgetId, [])
    }

    const seen = seenByBudget.get(budgetId)
    if (!seen || seen.has(entity)) continue

    seen.add(entity)
    entitiesByBudget.get(budgetId)?.push(entity)
  }

  return entitiesByBudget
}

export async function getDistinctEntitiesByBudget(supabase: SupabaseClient, budgetId: string): Promise<string[]> {
  const { data, error } = await getClient(supabase)
    .from('Budget_Hit')
    .select('budget_id, entity')
    .eq('budget_id', budgetId)
    .not('entity', 'is', null)
    .neq('entity', '')
    .order('date', { ascending: false })

  if (error) throw error

  return collectDistinctEntities(data || []).get(budgetId) ?? []
}

export async function getDistinctEntitiesByBudgets(
  supabase: SupabaseClient,
  budgetIds: string[]
): Promise<Record<string, string[]>> {
  const normalizedBudgetIds = [...new Set(budgetIds.map(id => id.trim()).filter(Boolean))]
  if (!normalizedBudgetIds.length) return {}

  const { data, error } = await getClient(supabase)
    .from('Budget_Hit')
    .select('budget_id, entity')
    .in('budget_id', normalizedBudgetIds)
    .not('entity', 'is', null)
    .neq('entity', '')
    .order('date', { ascending: false })

  if (error) throw error

  const distinctEntities = collectDistinctEntities(data || [])
  return Object.fromEntries(
    normalizedBudgetIds.map(budgetId => [budgetId, distinctEntities.get(budgetId) ?? []])
  )
}

export async function getBudgetHitsByMonth(supabase: SupabaseClient, year: number, month: number) {
  const nextMonth = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 }
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = `${nextMonth.year}-${String(nextMonth.month).padStart(2, '0')}-01`

  const { data, error } = await getClient(supabase)
    .from('Budget_Hit')
    .select('*')
    .eq('type', 'Expense')
    .gte('date', startDate)
    .lt('date', endDate)
    .order('date', { ascending: false })

  if (error) throw error
  return data || []
}

export async function getIncomeByMonth(supabase: SupabaseClient, householdId: string, year: number, month: number) {
  const nextMonth = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 }
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = `${nextMonth.year}-${String(nextMonth.month).padStart(2, '0')}-01`

  const { data, error } = await getClient(supabase)
    .from('Budget_Hit')
    .select('*')
    .eq('type', 'Income')
    .eq('household_id', householdId)
    .gte('date', startDate)
    .lt('date', endDate)
    .order('date', { ascending: false })

  if (error) throw error
  return data || []
}

export async function getUserProfiles(
  supabase: SupabaseClient,
  userIds: string[]
): Promise<Array<{ id: string; first_name: string | null; avatar_link: string | null }>> {
  if (!userIds.length) return []

  const { data, error } = await supabase
    .from('Profile')
    .select('user_id, first_name, avatar_link')
    .in('user_id', userIds)

  if (error) {
    console.warn('Could not load user profiles:', error.message)
    return []
  }

  return (data ?? []).map((p: any) => ({
    id: p.user_id,
    first_name: p.first_name ?? null,
    avatar_link: p.avatar_link ?? null,
  }))
}
