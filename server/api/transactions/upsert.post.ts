export default defineEventHandler(async (event) => {
  const { supabase } = await requireAuth(event)
  const body = await readBody(event)
  return upsertTransactions(supabase, body.transactions)
})
