export default defineEventHandler(async (event) => {
  const { supabase } = await requireAuth(event)
  const { budgets, year, month } = await readBody(event)
  const parsedYear = Number(year)
  const parsedMonth = Number(month)
  if (
    !Array.isArray(budgets)
    || budgets.length === 0
    || !Number.isInteger(parsedYear)
    || !Number.isInteger(parsedMonth)
    || parsedMonth < 1
    || parsedMonth > 12
  ) {
    throw createError({ statusCode: 400, statusMessage: 'Budgets and a valid year and month are required.' })
  }
  return createBudgetPeriods(supabase, budgets, parsedYear, parsedMonth)
})
