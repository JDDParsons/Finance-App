export default defineEventHandler(async (event) => {
  const { user, supabase } = await requireAuth(event)
  const householdId = await resolveHouseholdId(supabase, user.id)
  const { year, month } = getQuery(event)
  const parsedYear = Number(year)
  const parsedMonth = Number(month)
  if (!Number.isInteger(parsedYear) || !Number.isInteger(parsedMonth) || parsedMonth < 1 || parsedMonth > 12) {
    throw createError({ statusCode: 400, statusMessage: 'A valid budget year and month are required.' })
  }
  return getCopyPreviousBudgetPreview(supabase, householdId, parsedYear, parsedMonth)
})
