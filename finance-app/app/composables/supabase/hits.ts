import { getSupabase, resolveHouseholdId } from './client'

export async function createBudgetHit(budgetId: string | null, date: string, amount: string, note: string, accountId: string | null = null) {
  const supabase = getSupabase()
  const { data: auth } = await supabase.auth.getSession()
  const householdId = await resolveHouseholdId()
  const parsedAmount = parseFloat(amount)
  const { data, error } = await supabase
    .from('Budget_Hit')
    .insert({
      budget_id: budgetId,
      date: date,
      amount: parsedAmount,
      note: note,
      type: 'Expense',
      account_id: accountId,
      user_id: auth.session?.user?.id,
      household_id: householdId
    })
    .select()
    .single()

  if (error) throw error

  return data
}

export async function getBudgetHits() {
  const supabase = getSupabase()
  const { data: hits, error } = await supabase
    .from('Budget_Hit')
    .select('*')
    .eq('type', 'Expense')
    .order('date', { ascending: false })

  if (error) throw error
  return hits || []
}

export async function getBudgetHitsByBudgetId(budgetId: string) {
  const supabase = getSupabase()
  const { data: hits, error } = await supabase
    .from('Budget_Hit')
    .select('*')
    .eq('budget_id', budgetId)
    .eq('type', 'Expense')
    .order('date', { ascending: false })

  if (error) throw error
  return hits || []
}

export async function deleteBudgetHit(id: string) {
  const supabase = getSupabase()

  const { error } = await supabase
    .from('Budget_Hit')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function updateBudgetHit(id: string, budgetId: string | null, date: string, amount: string, note: string, accountId: string | null = null) {
  const supabase = getSupabase()

  const parsedAmount = parseFloat(amount)
  const { data, error } = await supabase
    .from('Budget_Hit')
    .update({
      budget_id: budgetId,
      date: date,
      amount: parsedAmount,
      note: note,
      account_id: accountId,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error

  return data
}

// --- Income ---

export async function getIncome() {
  const supabase = getSupabase()
  const householdId = await resolveHouseholdId()
  const { data, error } = await supabase
    .from('Budget_Hit')
    .select('*')
    .eq('type', 'Income')
    .eq('household_id', householdId)
    .order('date', { ascending: false })

  if (error) throw error
  return data || []
}

export async function insertIncome(amount: number, date: string, note: string, accountId: string | null = null) {
  const supabase = getSupabase()
  const { data: auth } = await supabase.auth.getSession()
  const householdId = await resolveHouseholdId()
  const { data, error } = await supabase
    .from('Budget_Hit')
    .insert({
      amount,
      date,
      note,
      type: 'Income',
      budget_id: null,
      account_id: accountId,
      user_id: auth.session?.user?.id,
      household_id: householdId
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteIncome(id: string) {
  const supabase = getSupabase()
  const { error } = await supabase
    .from('Budget_Hit')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function getBudgetHitsByMonth(year: number, month: number) {
  const supabase = getSupabase()
  const nextMonth = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 }
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = `${nextMonth.year}-${String(nextMonth.month).padStart(2, '0')}-01`
  const { data, error } = await supabase
    .from('Budget_Hit')
    .select('*')
    .eq('type', 'Expense')
    .gte('date', startDate)
    .lt('date', endDate)
    .order('date', { ascending: false })
  if (error) throw error
  return data || []
}

export async function getUserProfiles(userIds: string[]): Promise<Array<{ id: string; first_name: string | null; avatar_link: string | null }>> {
  if (!userIds.length) return []
  const supabase = getSupabase()
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

export async function getIncomeByMonth(year: number, month: number) {
  const supabase = getSupabase()
  const householdId = await resolveHouseholdId()
  const nextMonth = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 }
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = `${nextMonth.year}-${String(nextMonth.month).padStart(2, '0')}-01`
  const { data, error } = await supabase
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
