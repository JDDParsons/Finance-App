import { createTransfer } from '../../utils/supabase/hits'
import { validateTransferInput } from '../../utils/transfer'

export default defineEventHandler(async (event) => {
  const { user, supabase } = await requireAuth(event)
  const householdId = await resolveHouseholdId(supabase, user.id)

  try {
    const input = validateTransferInput(await readBody(event))
    return await createTransfer(supabase, user.id, householdId, input)
  } catch (error: any) {
    if (error?.statusCode) throw error
    throw createError({ statusCode: 400, statusMessage: error?.message || 'Invalid transfer.' })
  }
})
