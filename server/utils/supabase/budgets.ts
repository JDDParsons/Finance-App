import type { SupabaseClient } from '@supabase/supabase-js'
import { throwBudgetSupabaseError } from './budget-errors'
import { buildBudgetHistory } from '../../../utils/budgetHistory'
import { continuousMonthRange, monthStart, previousMonth } from '../../../utils/monthRange'
import type { BudgetType } from '../budget-types'

function getClient(supabase: SupabaseClient) {
  return supabase.schema('finance-app')
}

export async function createBudget(
  supabase: SupabaseClient,
  name: string,
  amount: string,
  color: string | undefined,
  icon: string | null | undefined,
  type: BudgetType,
  year: number,
  month: number
) {
  const { data, error } = await getClient(supabase)
    .rpc('create_budget_with_period', {
      budget_name: name,
      budget_amount: parseFloat(amount),
      budget_color: color ?? null,
      budget_icon: icon ?? null,
      budget_type: type,
      target_period_date: monthStart(year, month),
    })

  if (error) throwBudgetSupabaseError(error, 'create')
  return data
}

export async function getBudgets(supabase: SupabaseClient, householdId: string) {
  const { data: budgets, error } = await getClient(supabase)
    .from('Budgets')
    .select('*')
    .eq('household_id', householdId)
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

export async function getAvailableBudgets(
  supabase: SupabaseClient,
  householdId: string,
  year: number,
  month: number,
  type: BudgetType = 'Expense'
) {
  const targetDate = monthStart(year, month)
  const [{ data: budgets, error: budgetsError }, { data: periods, error: periodsError }] = await Promise.all([
    getClient(supabase).from('Budgets').select('*').eq('household_id', householdId).eq('type', type).order('name'),
    getClient(supabase)
      .from('Budget_Period')
      .select('budget_id, date, amount')
      .eq('household_id', householdId)
      .lte('date', targetDate)
      .order('date', { ascending: false }),
  ])
  if (budgetsError) throw budgetsError
  if (periodsError) throw periodsError

  const targetBudgetIds = new Set(
    (periods || []).filter(period => period.date === targetDate).map(period => period.budget_id)
  )
  const suggestionByBudget = new Map<string, number>()
  for (const period of periods || []) {
    if (period.date >= targetDate || !period.budget_id || suggestionByBudget.has(period.budget_id)) continue
    suggestionByBudget.set(period.budget_id, Number(period.amount))
  }

  return (budgets || [])
    .filter(budget => !targetBudgetIds.has(budget.id))
    .map(budget => ({ ...budget, suggestedAmount: suggestionByBudget.get(budget.id) ?? null }))
}

export async function getAvailableBudgetMonths(
  supabase: SupabaseClient,
  householdId: string
): Promise<{ year: number; month: number }[]> {
  const [{ data: hits, error: hitsError }, { data: periods, error: periodsError }] = await Promise.all([
    getClient(supabase).from('Budget_Hit').select('date').eq('household_id', householdId).order('date').limit(1),
    getClient(supabase).from('Budget_Period').select('date').eq('household_id', householdId).order('date').limit(1),
  ])
  if (hitsError) throw hitsError
  if (periodsError) throw periodsError

  const earliest = [hits?.[0]?.date, periods?.[0]?.date].filter(Boolean).sort()[0] ?? null
  return continuousMonthRange(earliest)
}

export async function getBudgetsByMonth(
  supabase: SupabaseClient,
  householdId: string,
  year: number,
  month: number,
  type: BudgetType = 'Expense'
) {
  const formattedDate = monthStart(year, month)
  const historyStartDate = new Date(Date.UTC(year, month - 12, 1)).toISOString().split('T')[0]
  const historyEndDate = new Date(Date.UTC(year, month, 1)).toISOString().split('T')[0]
  const now = new Date()
  const currentYear = now.getFullYear()
  const ytdStartDate = `${currentYear}-01-01`
  const ytdEndDate = new Date(Date.UTC(currentYear, now.getMonth() + 1, 1)).toISOString().split('T')[0]
  const spendingStartDate = historyStartDate < ytdStartDate ? historyStartDate : ytdStartDate
  const spendingEndDate = historyEndDate > ytdEndDate ? historyEndDate : ytdEndDate
  const [
    { data: allBudgets, error: budgetsError },
    { data: periods, error: periodsError },
    { data: spendingHits, error: spendingHitsError },
    { data: allocationPeriods, error: allocationPeriodsError },
  ] =
    await Promise.all([
      getClient(supabase).from('Budgets').select('*').eq('household_id', householdId).eq('type', type).order('created_at', { ascending: false }),
      getClient(supabase).from('Budget_Period').select('*').eq('household_id', householdId).eq('date', formattedDate),
      getClient(supabase)
        .from('Budget_Hit')
        .select('budget_id, date, amount')
        .eq('household_id', householdId)
        .eq('type', type)
        .gte('date', spendingStartDate)
        .lt('date', spendingEndDate),
      getClient(supabase)
        .from('Budget_Period')
        .select('budget_id, date, amount')
        .eq('household_id', householdId)
        .gte('date', spendingStartDate)
        .lt('date', spendingEndDate),
    ])

  if (budgetsError) throw budgetsError
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
      const actualYtd = ytdSpendingByBudget.get(b.id) || 0
      const ytdBalance = ytdBudgetIds.has(b.id)
        ? (type === 'Income' ? actualYtd - ytdAllocated : ytdAllocated - actualYtd)
        : null
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

export async function updateBudgetMetadata(
  supabase: SupabaseClient,
  id: string,
  name: string,
  color?: string,
  icon?: string | null
) {
  const { data, error } = await getClient(supabase)
    .rpc('update_budget_metadata', {
      target_budget_id: id,
      budget_name: name,
      budget_color: color ?? null,
      budget_icon: icon ?? null,
    })

  if (error) throwBudgetSupabaseError(error, 'update')
  return data
}

export async function createBudgetPeriod(
  supabase: SupabaseClient,
  id: string,
  amount: string,
  year: number,
  month: number
) {
  const { data, error } = await getClient(supabase).rpc('create_budget_period', {
    target_budget_id: id,
    budget_amount: parseFloat(amount),
    target_period_date: monthStart(year, month),
  })
  if (error) throwBudgetSupabaseError(error, 'create')
  return data
}

export async function createBudgetPeriods(
  supabase: SupabaseClient,
  budgets: Array<{ id: string; amount: string }>,
  year: number,
  month: number
) {
  const { data, error } = await getClient(supabase).rpc('create_budget_periods', {
    target_budget_ids: budgets.map(budget => budget.id),
    budget_amounts: budgets.map(budget => parseFloat(budget.amount)),
    target_period_date: monthStart(year, month),
  })
  if (error) throwBudgetSupabaseError(error, 'create')
  return { createdCount: Number(data) || 0 }
}

export async function updateBudgetPeriod(
  supabase: SupabaseClient,
  id: string,
  amount: string,
  year: number,
  month: number
) {
  const { data, error } = await getClient(supabase).rpc('update_budget_period', {
    target_budget_id: id,
    budget_amount: parseFloat(amount),
    target_period_date: monthStart(year, month),
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
  const targetPeriodDate = monthStart(year, month)
  const { error } = await getClient(supabase)
    .rpc('delete_budget_period', {
      target_budget_id: id,
      target_period_date: targetPeriodDate,
    })

  if (error) throwBudgetSupabaseError(error, 'delete')

  return { success: true }
}

export async function getCopyPreviousBudgetPreview(
  supabase: SupabaseClient,
  householdId: string,
  year: number,
  month: number,
  type: BudgetType = 'Expense'
) {
  const source = previousMonth(year, month)
  const sourceDate = monthStart(source.year, source.month)
  const destinationDate = monthStart(year, month)
  const [{ data: sourcePeriods, error: sourceError }, { data: destinationPeriods, error: destinationError }] = await Promise.all([
    getClient(supabase).from('Budget_Period').select('budget_id').eq('household_id', householdId).eq('date', sourceDate),
    getClient(supabase).from('Budget_Period').select('budget_id').eq('household_id', householdId).eq('date', destinationDate),
  ])
  if (sourceError) throw sourceError
  if (destinationError) throw destinationError

  const destinationIds = new Set((destinationPeriods || []).map(period => period.budget_id))
  const allSourceIds = (sourcePeriods || []).map(period => period.budget_id).filter(Boolean) as string[]
  const { data: sourceBudgets, error: sourceBudgetsError } = allSourceIds.length
    ? await getClient(supabase).from('Budgets').select('id, name').eq('household_id', householdId).eq('type', type).in('id', allSourceIds)
    : { data: [], error: null }
  if (sourceBudgetsError) throw sourceBudgetsError
  const sourceIds = (sourceBudgets || []).map(budget => budget.id)
  const sourceIdSet = new Set(sourceIds)
  const typedSourcePeriods = (sourcePeriods || []).filter(period => sourceIdSet.has(period.budget_id))
  const nameById = new Map((sourceBudgets || []).map(budget => [budget.id, budget.name]))
  const sourceCount = typedSourcePeriods.length
  const eligibleCount = typedSourcePeriods.filter(period => !destinationIds.has(period.budget_id)).length
  const eligibleNames = typedSourcePeriods
    .filter(period => !destinationIds.has(period.budget_id))
    .map(period => nameById.get(period.budget_id) ?? 'Budget')
  const skippedNames = typedSourcePeriods
    .filter(period => destinationIds.has(period.budget_id))
    .map(period => nameById.get(period.budget_id) ?? 'Budget')
  return { source, sourceCount, eligibleCount, skippedCount: sourceCount - eligibleCount, eligibleNames, skippedNames }
}

export async function copyPreviousBudgetPeriods(
  supabase: SupabaseClient,
  year: number,
  month: number,
  type: BudgetType = 'Expense'
) {
  const { data, error } = await getClient(supabase)
    .rpc('copy_previous_budget_periods', { target_period_date: monthStart(year, month), budget_type: type })

  if (error) throwBudgetSupabaseError(error, 'copy')
  const result = data?.[0] ?? { copied_count: 0, skipped_count: 0, source_count: 0 }
  return {
    copiedCount: result.copied_count,
    skippedCount: result.skipped_count,
    sourceCount: result.source_count,
  }
}
