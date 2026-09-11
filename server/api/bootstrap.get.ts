export default defineEventHandler(async (event) => {
  const { user, supabase } = await requireAuth(event)
  const query = getQuery(event)
  const year = Number(query.year)
  const month = Number(query.month)

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    throw createError({ statusCode: 400, message: 'Valid year and month query params are required' })
  }

  const householdId = await resolveHouseholdId(supabase, user.id)
  const previous = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 }
  const [
    profile,
    accounts,
    budgets,
    incomeBudgets,
    budgetHits,
    prevMonthBudgetHits,
    income,
    transfers,
    availableMonths,
    savings,
  ] = await Promise.all([
    getProfile(supabase, user.id),
    getAccounts(supabase),
    getBudgetsByMonth(supabase, householdId, year, month, 'Expense'),
    getBudgetsByMonth(supabase, householdId, year, month, 'Income'),
    getBudgetHitsByMonth(supabase, year, month),
    getBudgetHitsByMonth(supabase, previous.year, previous.month),
    getIncomeByMonth(supabase, householdId, year, month),
    getTransfersByMonth(supabase, householdId, year, month),
    getAvailableBudgetMonths(supabase, householdId),
    getTrailingSavingsTotals(supabase, householdId, year, month),
  ])

  const budgetIds = [...budgets, ...incomeBudgets].map(budget => budget.id).filter(Boolean)
  const userIds = [...new Set(budgetHits.map(hit => hit.user_id).filter(Boolean))]
  const [profiles, budgetEntities] = await Promise.all([
    getUserProfiles(supabase, userIds),
    budgetIds.length ? getDistinctEntitiesByBudgets(supabase, budgetIds) : Promise.resolve({}),
  ])

  return {
    schemaVersion: 1,
    userId: user.id,
    syncedAt: new Date().toISOString(),
    profile,
    accounts,
    finance: {
      selectedMonth: { year, month },
      availableMonths,
      budgets,
      incomeBudgets,
      budgetHits,
      prevMonthBudgetHits,
      income,
      transfers,
      userProfiles: Object.fromEntries(profiles.map(profileRow => [profileRow.id, {
        firstName: profileRow.first_name,
        avatarLink: profileRow.avatar_link,
      }])),
      budgetEntities,
    },
    savings,
  }
})
