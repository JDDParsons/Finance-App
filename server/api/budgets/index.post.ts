export default defineEventHandler(async (event) => {
  const { supabase } = await requireAuth(event)
  const body = await readBody(event)

  const { name, amount, color, icon, type, year, month } = body
  const budgetType = parseBudgetType(type)
  const parsedYear = Number(year)
  const parsedMonth = Number(month)
  if (!Number.isInteger(parsedYear) || !Number.isInteger(parsedMonth) || parsedMonth < 1 || parsedMonth > 12) {
    throw createError({ statusCode: 400, statusMessage: 'A valid budget year and month are required.' })
  }
  return createBudget(supabase, name, amount, color, icon, budgetType, parsedYear, parsedMonth)
})
