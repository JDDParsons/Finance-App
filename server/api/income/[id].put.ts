import { updateIncome } from "~~/server/utils/supabase/hits"

export default defineEventHandler(async (event) => {
  const { supabase } = await requireAuth(event)
  const id = getRouterParam(event, 'id')!
  const body = await readBody(event)

  const { amount, date, entity, accountId, notes } = body
  return updateIncome(supabase, id, amount, date, entity, accountId ?? null, notes)
})
