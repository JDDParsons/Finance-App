export default defineEventHandler(async (event) => {
  const { supabase } = await requireAuth(event)
  const { year, month } = await readBody(event)
  const parsedYear = Number(year)
  const parsedMonth = Number(month)
  if (!Number.isInteger(parsedYear) || !Number.isInteger(parsedMonth) || parsedMonth < 1 || parsedMonth > 12) {
    throw createError({ statusCode: 400, statusMessage: 'A valid budget year and month are required.' })
  }
  return copyPreviousBudgetPeriods(supabase, parsedYear, parsedMonth)
})
