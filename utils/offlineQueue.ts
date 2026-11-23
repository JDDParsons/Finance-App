import type {
  OfflineAction,
  OfflineEntity,
  OfflineOperation,
  OfflineQueueChange,
} from '../app/types/offline'

const ACTION_ORDER: Record<OfflineAction, number> = { create: 0, edit: 1, delete: 2 }

/**
 * Entries saved before Phase 2 only had `kind` (always a create). Read them as
 * create operations so they still replay after an update.
 */
export function normalizeOperation(raw: any): OfflineOperation {
  return {
    id: raw.id,
    userId: raw.userId,
    entity: raw.entity ?? raw.kind,
    action: raw.action ?? 'create',
    targetId: raw.targetId ?? raw.id,
    payload: raw.payload ?? {},
    createdAt: raw.createdAt,
    attempts: raw.attempts ?? 0,
    status: raw.status ?? 'pending',
    error: raw.error ?? null,
  }
}

/**
 * Replay order: oldest first, and for entries created in the same instant a
 * create runs before an edit, and an edit before a delete.
 *
 * Expenses, income and transfers do not depend on each other (budgets and
 * accounts are online-only), so the creation time is enough for now. Features
 * whose entries reference one another (a tag before the expense that uses it)
 * must be queued after what they depend on, which this order already gives.
 */
export function sortForReplay(operations: OfflineOperation[]) {
  return [...operations].sort((left, right) =>
    left.createdAt.localeCompare(right.createdAt)
    || ACTION_ORDER[left.action] - ACTION_ORDER[right.action]
  )
}

export function operationsForTarget(queue: OfflineOperation[], entity: OfflineEntity, targetId: string) {
  return queue.filter(operation => operation.entity === entity && operation.targetId === targetId)
}

export function hasQueuedOperation(queue: OfflineOperation[], entity: OfflineEntity, targetId: string) {
  return operationsForTarget(queue, entity, targetId).length > 0
}

interface QueueInput {
  id: string
  userId: string
  entity: OfflineEntity
  targetId: string
  now: string
}

/**
 * Queue an edit. An edit of something still waiting to be created is folded
 * into the create; a second edit of the same row replaces the first. Nothing is
 * queued for a row that is already queued for deletion.
 */
export function planEdit(
  queue: OfflineOperation[],
  input: QueueInput & { payload: Record<string, unknown> }
): OfflineQueueChange {
  const related = operationsForTarget(queue, input.entity, input.targetId)
  if (related.some(operation => operation.action === 'delete')) return { put: [], remove: [] }

  const existing = related.find(operation => operation.action === 'create')
    ?? related.find(operation => operation.action === 'edit')
  if (existing) {
    return {
      put: [{
        ...existing,
        payload: { ...existing.payload, ...input.payload },
        status: 'pending',
        error: null,
      }],
      remove: [],
    }
  }

  return {
    put: [{
      id: input.id,
      userId: input.userId,
      entity: input.entity,
      action: 'edit',
      targetId: input.targetId,
      payload: input.payload,
      createdAt: input.now,
      attempts: 0,
      status: 'pending',
      error: null,
    }],
    remove: [],
  }
}

/**
 * Queue a delete. Deleting something that was never saved just removes its
 * queued create. Otherwise queued edits of the row are dropped, because the
 * delete wins, and a single delete is queued.
 */
export function planDelete(queue: OfflineOperation[], input: QueueInput): OfflineQueueChange {
  const related = operationsForTarget(queue, input.entity, input.targetId)
  if (related.some(operation => operation.action === 'create')) {
    return { put: [], remove: related.map(operation => operation.id) }
  }

  const remove = related.filter(operation => operation.action === 'edit').map(operation => operation.id)
  if (related.some(operation => operation.action === 'delete')) return { put: [], remove }

  return {
    put: [{
      id: input.id,
      userId: input.userId,
      entity: input.entity,
      action: 'delete',
      targetId: input.targetId,
      payload: {},
      createdAt: input.now,
      attempts: 0,
      status: 'pending',
      error: null,
    }],
    remove,
  }
}

export const MISSING_ROW_MESSAGE = 'This item was deleted elsewhere, so the change was dropped.'

export function replayStatus(error: any): number | undefined {
  return error?.statusCode ?? error?.status ?? error?.response?.status
}

/**
 * Conflict rules: last write wins and a delete beats an edit.
 * - Deleting a row that is already gone counts as success.
 * - Editing a row that is gone is dropped and shown in the failed list.
 * - Anything else the server rejects is shown in the failed list with its message.
 */
export function classifyReplayError(
  action: OfflineAction,
  error: any
): { outcome: 'done' } | { outcome: 'failed'; message: string } {
  const status = replayStatus(error)
  if (action === 'delete' && status === 404) return { outcome: 'done' }
  if (action === 'edit' && status === 404) return { outcome: 'failed', message: MISSING_ROW_MESSAGE }
  return {
    outcome: 'failed',
    message: error?.data?.message || error?.statusMessage || error?.message || 'Could not sync this change.',
  }
}
