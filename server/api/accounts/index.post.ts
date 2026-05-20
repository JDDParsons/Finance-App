export default defineEventHandler(async (event) => {
  const { user, supabase } = await requireAuth(event)
  const householdId = await resolveHouseholdId(supabase, user.id)
  const body = await readBody(event)

  const { name, institution, baselineAmount, cardNumber, isCreditCard, isDefaultForExpenses, isDefaultForIncome } = body

  return createAccount(supabase, user.id, householdId, name, institution, baselineAmount, cardNumber, isCreditCard, isDefaultForExpenses, isDefaultForIncome)
})
