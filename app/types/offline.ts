export type OfflineEntity = 'expense' | 'income' | 'transfer'
export type OfflineAction = 'create' | 'edit' | 'delete'

/**
 * One queued change. For a create, `id` is the client-generated operationId and
 * `targetId` equals it (the optimistic row uses the same id). For an edit or
 * delete, `targetId` is the id of the existing server row.
 */
export interface OfflineOperation {
  id: string
  userId: string
  entity: OfflineEntity
  action: OfflineAction
  targetId: string
  payload: Record<string, unknown>
  createdAt: string
  attempts: number
  status: 'pending' | 'failed'
  error: string | null
}

export interface OfflineReplayResult {
  operation: OfflineOperation
  /** The saved server row, for a successful create or edit. */
  row?: any
  /** Set when the change was rejected or dropped; the entry stays queued as failed. */
  error?: string
}

/** Changes to apply to the outbox in one step. */
export interface OfflineQueueChange {
  put: OfflineOperation[]
  remove: string[]
}
