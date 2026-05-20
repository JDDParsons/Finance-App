export default defineEventHandler(async (event) => {
  const { supabase } = await requireAuth(event)
  return getBudgetHits(supabase)
})
