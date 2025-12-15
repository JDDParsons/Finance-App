import { FormService } from '../services/form.service'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)

    if (!body || typeof body !== 'object') {
      throw createError({ statusCode: 400, statusMessage: 'Invalid request body' })
    }

    const service = new FormService()
    const saved = await service.saveBalance(body as any)

    return {
      message: 'Balance saved',
      id: saved.id,
      record: saved,
    }
  } catch (err: any) {
    throw createError({ statusCode: err.statusCode || 500, statusMessage: err.message || 'Server error' })
  }
})
