import { validateTransferInput } from '../../utils/transfer'

export default defineEventHandler(async (event) => {
  const { supabase } = await requireAuth(event)

  try {
    const body = await readBody(event)
    const input = validateTransferInput(body)
    return await createBudgetHitIdempotent(supabase, {
      operationId: requireOperationId(body.operationId),
      type: 'Transfer',
      amount: input.amount,
      date: input.date,
      accountId: input.fromAccountId,
      destinationAccountId: input.toAccountId,
    })
  } catch (error: any) {
    if (error?.statusCode) throw error
    throw createError({ statusCode: 400, statusMessage: error?.message || 'Invalid transfer.' })
  }
})
