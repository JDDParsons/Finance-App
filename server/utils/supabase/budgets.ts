import type { SupabaseClient } from '@supabase/supabase-js'

function getClient(supabase: SupabaseClient) {
  return supabase.schema('finance-app')
}

export async function createBudget(
  supabase: SupabaseClient,
  userId: string,
  householdId: string,
  name: string,
  amount: string,
  color?: string,
  icon?: string | null
) {
  const { data, error } = await getClient(supabase)
    .from('Budgets')
    .insert({
      name,
      amount: parseFloat(amount),
      user_id: userId,
      household_id: householdId,
      ...(color ? { color } : {}),
      ...(icon ? { icon } : {}),
    })
    .select()
    .single()

  const now = new Date()
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
  const year = firstDay.getFullYear()
  const month = String(firstDay.getMonth() + 1).padStart(2, '0')
  const result = `${year}-${month}-01`

  const { data: periodData, error: periodError } = await getClient(supabase)
    .from('Budget_Period')
    .insert({
      budget_id: data?.id,
      date: result,
      amount: parseFloat(amount),
      user_id: userId,
      household_id: householdId,
    })
    .select()
    .single()

  if (periodError) throw periodError
  if (error) throw error

  return { data, periodData }
}

export async function getBudgets(supabase: SupabaseClient, householdId: string) {
  const { data: budgets, error } = await getClient(supabase)
    .from('Budgets')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error

  const { data: budgetPeriods, error: periodError } = await getClient(supabase)
    .from('Budget_Period')
    .select('*')

  if (periodError) throw periodError

  const currentMonth = new Date().getMonth() + 1
  const currentYear = new Date().getFullYear()
  const formattedDate = new Date(currentYear, currentMonth - 1, 1).toISOString().split('T')[0]

  for (const b of budgets) {
    b.currentPeriod = budgetPeriods?.find((p: any) => p.budget_id === b.id && p.date === formattedDate) || null

    if (!b.currentPeriod) {
      const { data: newPeriod, error: newPeriodError } = await getClient(supabase)
        .from('Budget_Period')
        .insert({
          budget_id: b.id,
          date: formattedDate,
          amount: b.amount,
          user_id: b.user_id,
          household_id: householdId,
        })
        .select()
        .single()

      if (newPeriodError) console.error('Error creating new budget period:', newPeriodError)
      b.currentPeriod = newPeriod || null
    }
  }

  return budgets || []
}

export async function getAvailableBudgetMonths(supabase: SupabaseClient): Promise<{ year: number; month: number }[]> {
  const { data, error } = await getClient(supabase)
    .from('Budget_Hit')
    .select('date')
    .eq('type', 'Expense')
    .order('date', { ascending: true })
  if (error) throw error

  const seen = new Set<string>()
  const result: { year: number; month: number }[] = []
  for (const row of data || []) {
    const [yearStr, monthStr] = (row.date as string).split('-')
    const key = `${yearStr ?? ''}-${monthStr ?? ''}`
    if (!seen.has(key)) {
      seen.add(key)
      result.push({ year: parseInt(yearStr ?? '0'), month: parseInt(monthStr ?? '0') })
    }
  }
  return result
}

export async function getBudgetsByMonth(
  supabase: SupabaseClient,
  householdId: string,
  year: number,
  month: number
) {
  const formattedDate = `${year}-${String(month).padStart(2, '0')}-01`
  const now = new Date()
  const isCurrentMonth = year === now.getFullYear() && month === (now.getMonth() + 1)

  const [{ data: allBudgets, error: budgetsError }, { data: periods, error: periodsError }] =
    await Promise.all([
      getClient(supabase).from('Budgets').select('*').order('created_at', { ascending: false }),
      getClient(supabase).from('Budget_Period').select('*').eq('date', formattedDate),
    ])

  if (budgetsError) throw budgetsError
  if (periodsError) throw periodsError

  const periodMap = new Map((periods || []).map((p: any) => [p.budget_id, p]))
  const result: any[] = []

  for (const b of allBudgets || []) {
    let period = periodMap.get(b.id) || null

    if (!period && isCurrentMonth) {
      const { data: newPeriod, error: newPeriodError } = await getClient(supabase)
        .from('Budget_Period')
        .insert({ budget_id: b.id, date: formattedDate, amount: b.amount, user_id: b.user_id, household_id: householdId })
        .select()
        .single()
      if (newPeriodError) console.error('Error creating budget period:', newPeriodError)
      period = newPeriod || null
    }

    if (period) {
      result.push({ ...b, currentPeriod: period })
    }
  }

  return result
}

export async function getBudgetById(supabase: SupabaseClient, id: string) {
  const { data: budget, error } = await getClient(supabase)
    .from('Budgets')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error

  const { data: budgetPeriods, error: periodError } = await getClient(supabase)
    .from('Budget_Period')
    .select('*')
    .eq('budget_id', id)

  if (periodError) throw periodError
  budget.currentPeriod = budgetPeriods?.[0] || null
  return budget
}

export async function updateBudget(
  supabase: SupabaseClient,
  id: string,
  name: string,
  amount: string,
  color?: string,
  icon?: string | null,
  year?: number,
  month?: number
) {
  const { data, error } = await getClient(supabase)
    .from('Budgets')
    .update({
      name,
      amount: parseFloat(amount),
      ...(color !== undefined ? { color } : {}),
      ...(icon !== undefined ? { icon } : {}),
    })
    .eq('id', id)
    .select()
    .single()

  const targetYear = year ?? new Date().getFullYear()
  const targetMonth = month ?? (new Date().getMonth() + 1)
  const formattedDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`

  const { data: periodData, error: periodError } = await getClient(supabase)
    .from('Budget_Period')
    .update({ amount: parseFloat(amount) })
    .eq('budget_id', id)
    .eq('date', formattedDate)
    .select()
    .single()

  if (periodError) throw periodError
  if (error) throw error
  return { data, periodData }
}

export async function deleteBudget(supabase: SupabaseClient, id: string) {
  const { error } = await getClient(supabase)
    .from('Budgets')
    .delete()
    .eq('id', id)

  if (error) throw error
}
