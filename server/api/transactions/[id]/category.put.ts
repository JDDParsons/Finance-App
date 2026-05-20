export default defineEventHandler(async (event) => {
  const { supabase } = await requireAuth(event)
  const id = getRouterParam(event, 'id')!
  const body = await readBody(event)
  return setTransactionCategory(supabase, id, body.categoryId)
})
