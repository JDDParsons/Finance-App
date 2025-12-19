import { StatementsService } from '../services/statements.service'

export default defineEventHandler(async (event) => {
  try {
    const service = new StatementsService()
    const records = await service.getGroupsWithCounts()
    return records
  } catch (err: any) {
    throw createError({ statusCode: err.statusCode || 500, statusMessage: err.message || 'Server error' })
  }
})
