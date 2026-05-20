export default defineEventHandler(async (event) => {
  const { supabase } = await requireAuth(event)
  const id = getRouterParam(event, 'id')!
  const body = await readBody(event)

  const { name, amount, color, icon, year, month } = body
  return updateBudget(supabase, id, name, amount, color, icon, year, month)
})
