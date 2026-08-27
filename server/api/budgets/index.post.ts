export default defineEventHandler(async (event) => {
  const { supabase } = await requireAuth(event)
  const body = await readBody(event)

  const { name, amount, color, icon } = body
  return createBudget(supabase, name, amount, color, icon)
})
