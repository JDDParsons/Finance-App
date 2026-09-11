import { randomUUID } from 'node:crypto'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function requireOperationId(value: unknown) {
  if (value === undefined || value === null || value === '') return randomUUID()
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) {
    throw createError({ statusCode: 400, statusMessage: 'A valid operationId is required.' })
  }
  return value
}
