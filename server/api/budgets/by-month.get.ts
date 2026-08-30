export default defineEventHandler(async (event) => {
  const { user, supabase } = await requireAuth(event)
  const householdId = await resolveHouseholdId(supabase, user.id)
  const query = getQuery(event)

  const year = parseInt(String(query.year))
  const month = parseInt(String(query.month))
  const type = parseBudgetType(query.type)

  if (isNaN(year) || isNaN(month)) {
    throw createError({ statusCode: 400, message: 'year and month query params are required' })
  }

  return getBudgetsByMonth(supabase, householdId, year, month, type)
})
