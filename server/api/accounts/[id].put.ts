export default defineEventHandler(async (event) => {
  const { supabase } = await requireAuth(event)
  const id = getRouterParam(event, 'id')!
  const body = await readBody(event)

  const { name, institution, cardNumber, isCreditCard, isDefaultForExpenses, isDefaultForIncome } = body

  return updateAccount(supabase, id, name, institution, cardNumber, isCreditCard, isDefaultForExpenses, isDefaultForIncome)
})
