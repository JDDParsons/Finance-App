export default defineEventHandler(async (event) => {
  const { user, supabase } = await requireAuth(event)
  const householdId = await resolveHouseholdId(supabase, user.id)
  const body = await readBody(event)

  const { budgetId, date, amount, note, accountId } = body
  return createBudgetHit(supabase, user.id, householdId, budgetId ?? null, date, amount, note, accountId ?? null)
})
