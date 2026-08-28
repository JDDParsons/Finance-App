import type { SupabaseClient } from '@supabase/supabase-js'
import { throwBudgetSupabaseError } from './budget-errors'
import { buildBudgetHistory } from '../../../utils/budgetHistory'

function getClient(supabase: SupabaseClient) {
  return supabase.schema('finance-app')
}

async function ensureCurrentBudgetPeriods(supabase: SupabaseClient) {
  const { error } = await getClient(supabase).rpc('ensure_current_budget_periods')
  if (error) throw error
}

export async function createBudget(
  supabase: SupabaseClient,
  name: string,
  amount: string,
  color?: string,
  icon?: string | null
) {
  const { data, error } = await getClient(supabase)
    .rpc('create_budget_with_period', {
      budget_name: name,
      budget_amount: parseFloat(amount),
      budget_color: color ?? null,
      budget_icon: icon ?? null,
    })

  if (error) throwBudgetSupabaseError(error, 'create')
  return data
}

export async function getBudgets(supabase: SupabaseClient, householdId: string) {
  await ensureCurrentBudgetPeriods(supabase)

  const { data: budgets, error } = await getClient(supabase)
    .from('Budgets')
    .select('*')
    .eq('inactive', false)
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

  }

  return budgets || []
}

export async function getInactiveBudgets(supabase: SupabaseClient, householdId: string) {
  const { data, error } = await getClient(supabase)
    .from('Budgets')
    .select('*')
    .eq('household_id', householdId)
    .eq('inactive', true)
    .order('name', { ascending: true })

  if (error) throw error
  return data || []
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
  const historyStartDate = new Date(Date.UTC(year, month - 12, 1)).toISOString().split('T')[0]
  const historyEndDate = new Date(Date.UTC(year, month, 1)).toISOString().split('T')[0]
  const now = new Date()
  const currentYear = now.getFullYear()
  const ytdStartDate = `${currentYear}-01-01`
  const ytdEndDate = new Date(Date.UTC(currentYear, now.getMonth() + 1, 1)).toISOString().split('T')[0]
  const spendingStartDate = historyStartDate < ytdStartDate ? historyStartDate : ytdStartDate
  const spendingEndDate = historyEndDate > ytdEndDate ? historyEndDate : ytdEndDate
  const isCurrentMonth = year === now.getFullYear() && month === (now.getMonth() + 1)

  if (isCurrentMonth) {
    await ensureCurrentBudgetPeriods(supabase)
  }

  const { data: allBudgets, error: budgetsError } = await getClient(supabase)
    .from('Budgets')
    .select('*')
    .order('created_at', { ascending: false })

  if (budgetsError) throw budgetsError

  const budgetIds = (allBudgets || []).map(budget => budget.id).filter(Boolean)
  if (!budgetIds.length) return []

  const [
    { data: periods, error: periodsError },
    { data: spendingHits, error: spendingHitsError },
    { data: allocationPeriods, error: allocationPeriodsError },
  ] =
    await Promise.all([
      getClient(supabase)
        .from('Budget_Period')
        .select('*')
        .eq('date', formattedDate)
        .in('budget_id', budgetIds),
      getClient(supabase)
        .from('Budget_Hit')
        .select('budget_id, date, amount')
        .eq('household_id', householdId)
        .eq('type', 'Expense')
        .gte('date', spendingStartDate)
        .lt('date', spendingEndDate),
      getClient(supabase)
        .from('Budget_Period')
        .select('budget_id, date, amount')
        .in('budget_id', budgetIds)
        .gte('date', spendingStartDate)
        .lt('date', spendingEndDate),
    ])

  if (periodsError) throw periodsError
  if (spendingHitsError) throw spendingHitsError
  if (allocationPeriodsError) throw allocationPeriodsError

  const historyByBudget = buildBudgetHistory(
    allocationPeriods || [],
    spendingHits || [],
    historyStartDate,
    historyEndDate
  )

  const monthlySpendingByBudget = new Map<string, Map<string, number>>()
  const ytdSpendingByBudget = new Map<string, number>()
  const ytdBudgetIds = new Set<string>()
  for (const hit of spendingHits || []) {
    if (!hit.budget_id || !hit.date) continue
    const hitDate = String(hit.date)
    const amount = Number(hit.amount) || 0

    if (hitDate >= historyStartDate && hitDate < historyEndDate) {
      const monthKey = hitDate.slice(0, 7)
      const monthlySpending = monthlySpendingByBudget.get(hit.budget_id) ?? new Map<string, number>()
      monthlySpending.set(monthKey, (monthlySpending.get(monthKey) || 0) + amount)
      monthlySpendingByBudget.set(hit.budget_id, monthlySpending)
    }

    if (hitDate >= ytdStartDate && hitDate < ytdEndDate) {
      ytdSpendingByBudget.set(hit.budget_id, (ytdSpendingByBudget.get(hit.budget_id) || 0) + amount)
      ytdBudgetIds.add(hit.budget_id)
    }
  }

  const historyPeriodMonthsByBudget = new Map<string, Set<string>>()
  const ytdAllocationsByBudget = new Map<string, Map<string, number>>()
  for (const period of allocationPeriods || []) {
    if (!period.budget_id || !period.date) continue
    const periodDate = String(period.date)
    const monthKey = periodDate.slice(0, 7)

    if (periodDate >= historyStartDate && periodDate < historyEndDate) {
      const historyMonths = historyPeriodMonthsByBudget.get(period.budget_id) ?? new Set<string>()
      historyMonths.add(monthKey)
      historyPeriodMonthsByBudget.set(period.budget_id, historyMonths)
    }

    if (periodDate >= ytdStartDate && periodDate < ytdEndDate) {
      const monthlyAllocations = ytdAllocationsByBudget.get(period.budget_id) ?? new Map<string, number>()
      monthlyAllocations.set(monthKey, Number(period.amount) || 0)
      ytdAllocationsByBudget.set(period.budget_id, monthlyAllocations)
      ytdBudgetIds.add(period.budget_id)
    }
  }

  const periodMap = new Map((periods || []).map((p: any) => [p.budget_id, p]))
  const result: any[] = []

  for (const b of allBudgets || []) {
    const period = periodMap.get(b.id) || null

    if (period) {
      const monthlySpending = monthlySpendingByBudget.get(b.id)
      const historyPeriodMonths = historyPeriodMonthsByBudget.get(b.id)
      const averageMonthlySpending = historyPeriodMonths?.size
        ? [...historyPeriodMonths].reduce((sum, monthKey) => sum + (monthlySpending?.get(monthKey) || 0), 0)
          / historyPeriodMonths.size
        : null
      const ytdAllocations = ytdAllocationsByBudget.get(b.id)
      const ytdAllocated = ytdAllocations
        ? [...ytdAllocations.values()].reduce((sum, amount) => sum + amount, 0)
        : 0
      const ytdBalance = ytdBudgetIds.has(b.id) ? ytdAllocated - (ytdSpendingByBudget.get(b.id) || 0) : null
      result.push({
        ...b,
        currentPeriod: period,
        averageMonthlySpending,
        ytdBalance,
        history: historyByBudget.get(b.id) || [],
      })
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
  const targetYear = year ?? new Date().getFullYear()
  const targetMonth = month ?? (new Date().getMonth() + 1)
  const formattedDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`

  const { data, error } = await getClient(supabase)
    .rpc('update_budget_with_period', {
      target_budget_id: id,
      budget_name: name,
      budget_amount: parseFloat(amount),
      budget_color: color ?? null,
      budget_icon: icon ?? null,
      update_color: color !== undefined,
      update_icon: icon !== undefined,
      target_period_date: formattedDate,
    })

  if (error) throwBudgetSupabaseError(error, 'update')
  return data
}

export async function deleteBudgetPeriod(
  supabase: SupabaseClient,
  id: string,
  year: number,
  month: number
) {
  const targetPeriodDate = `${year}-${String(month).padStart(2, '0')}-01`
  const { data, error } = await getClient(supabase)
    .rpc('delete_budget_period', {
      target_budget_id: id,
      target_period_date: targetPeriodDate,
    })

  if (error) throwBudgetSupabaseError(error, 'delete')

  return { budgetDeleted: data?.[0]?.budget_deleted === true }
}

export async function reactivateBudget(supabase: SupabaseClient, id: string) {
  const { error } = await getClient(supabase)
    .rpc('reactivate_budget', { target_budget_id: id })

  if (error) throw error
}
