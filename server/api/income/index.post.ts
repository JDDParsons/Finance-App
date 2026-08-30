export default defineEventHandler(async (event) => {
  const { user, supabase } = await requireAuth(event)
  const householdId = await resolveHouseholdId(supabase, user.id)
  const body = await readBody(event)

  const { amount, date, entity, budgetId, accountId, notes } = body
  return insertIncome(supabase, user.id, householdId, amount, date, entity, budgetId ?? null, accountId ?? null, notes ?? null)
})
