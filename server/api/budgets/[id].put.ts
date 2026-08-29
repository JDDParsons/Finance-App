export default defineEventHandler(async (event) => {
  const { supabase } = await requireAuth(event)
  const id = getRouterParam(event, 'id')!
  const body = await readBody(event)

  const { name, color, icon } = body
  return updateBudgetMetadata(supabase, id, name, color, icon)
})
