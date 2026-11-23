import { createError } from 'h3'

/**
 * PostgREST reports an update that matched no row as PGRST116 (`.single()` found
 * zero rows). Answer 404 so a queued offline edit of a row that was deleted
 * elsewhere is recognized and dropped instead of retried. Deletes of a missing
 * row already succeed, which keeps replaying a delete safe.
 */
export function throwIfRowMissing(error: { code?: string }) {
  if (error.code === 'PGRST116') {
    throw createError({ statusCode: 404, statusMessage: 'This record no longer exists.' })
  }
}
