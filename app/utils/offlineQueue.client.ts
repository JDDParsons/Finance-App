import {
  NotAuthenticatedError,
  SessionUnavailableError,
  getSavedUserId,
  isSessionExpiredError,
  resolveSession,
} from '~/composables/supabase/session'
import { apiFetch } from '~/composables/useApiToken'
import type {
  OfflineAction,
  OfflineEntity,
  OfflineOperation,
  OfflineQueueChange,
  OfflineReplayResult,
} from '~/types/offline'
import {
  applyOfflineQueueChange,
  deleteOfflineOperation,
  getOfflineOperations,
  putOfflineOperation,
} from './offlineFinanceCache.client'
import { buildOptimisticEdit, buildOptimisticRow } from '../../utils/offlineRows'
import {
  classifyReplayError,
  hasQueuedOperation,
  planDelete,
  planEdit,
} from '../../utils/offlineQueue'

const ENDPOINTS: Record<OfflineEntity, string> = {
  expense: '/api/hits',
  income: '/api/income',
  transfer: '/api/transfers',
}

function notifyOutboxChanged() {
  window.dispatchEvent(new CustomEvent('budgify-outbox-changed'))
}

function isNetworkFailure(error: any) {
  if (error instanceof NotAuthenticatedError) return false
  if (error instanceof SessionUnavailableError) return true
  return !navigator.onLine || (!error?.response && !error?.status && !error?.statusCode)
}

// Queueing must work without a valid token, so use the user id saved on this device.
async function requireUserId() {
  const saved = getSavedUserId()
  if (saved) return saved
  const auth = await resolveSession()
  if (auth.state === 'signed-out') throw new NotAuthenticatedError()
  return auth.userId
}

async function applyChange(change: OfflineQueueChange) {
  await applyOfflineQueueChange(change)
  notifyOutboxChanged()
}

export async function createOrQueueOffline(
  entity: OfflineEntity,
  payload: Record<string, unknown>
) {
  const operationId = crypto.randomUUID()
  try {
    return await apiFetch<any>(ENDPOINTS[entity], {
      method: 'POST',
      body: { ...payload, operationId },
    })
  } catch (error: any) {
    if (!isNetworkFailure(error)) throw error
    const userId = await requireUserId()
    await putOfflineOperation({
      id: operationId,
      userId,
      entity,
      action: 'create',
      targetId: operationId,
      payload,
      createdAt: new Date().toISOString(),
      attempts: 0,
      status: 'pending',
      error: null,
    })
    notifyOutboxChanged()
    return buildOptimisticRow(entity, operationId, userId, payload)
  }
}

/**
 * Edit a row. A row that already has a queued change (including a create that has
 * not synced yet) is edited in the queue, so the server never sees an id it does
 * not know and edits cannot overtake each other. Otherwise the edit is sent now
 * and queued only if the connection fails.
 */
export async function editOrQueueOffline(
  entity: OfflineEntity,
  targetId: string,
  payload: Record<string, unknown>,
  existing: Record<string, any> | undefined
) {
  const userId = await requireUserId()
  const queueEdit = async () => {
    const queue = await getOfflineOperations(userId)
    await applyChange(planEdit(queue, {
      id: crypto.randomUUID(), userId, entity, targetId, payload, now: new Date().toISOString(),
    }))
    return buildOptimisticEdit(entity, existing, userId, targetId, payload)
  }

  if (hasQueuedOperation(await getOfflineOperations(userId), entity, targetId)) return queueEdit()
  try {
    return await apiFetch<any>(`${ENDPOINTS[entity]}/${targetId}`, { method: 'PUT', body: payload })
  } catch (error: any) {
    if (!isNetworkFailure(error)) throw error
    return queueEdit()
  }
}

/** Delete a row; see `editOrQueueOffline` for when the change is queued. */
export async function deleteOrQueueOffline(entity: OfflineEntity, targetId: string) {
  const userId = await requireUserId()
  const queueDelete = async () => {
    const queue = await getOfflineOperations(userId)
    await applyChange(planDelete(queue, {
      id: crypto.randomUUID(), userId, entity, targetId, now: new Date().toISOString(),
    }))
  }

  if (hasQueuedOperation(await getOfflineOperations(userId), entity, targetId)) return queueDelete()
  try {
    await apiFetch(`${ENDPOINTS[entity]}/${targetId}`, { method: 'DELETE' })
  } catch (error: any) {
    if (!isNetworkFailure(error)) throw error
    await queueDelete()
  }
}

function send(operation: OfflineOperation) {
  const base = ENDPOINTS[operation.entity]
  const requests: Record<OfflineAction, () => Promise<any>> = {
    create: () => apiFetch<any>(base, {
      method: 'POST',
      body: { ...operation.payload, operationId: operation.id },
    }),
    edit: () => apiFetch<any>(`${base}/${operation.targetId}`, { method: 'PUT', body: operation.payload }),
    delete: () => apiFetch<any>(`${base}/${operation.targetId}`, { method: 'DELETE' }),
  }
  return requests[operation.action]()
}

/**
 * Send queued changes oldest first, one at a time. A network failure stops the
 * run and leaves the rest queued; a rejection marks that entry failed and
 * carries on. A 401 is rethrown so the caller can ask the user to sign in.
 */
export async function replayOfflineOperations(userId: string, retryFailed = false): Promise<OfflineReplayResult[]> {
  const results: OfflineReplayResult[] = []
  for (const operation of await getOfflineOperations(userId)) {
    if (operation.status === 'failed' && !retryFailed) continue
    try {
      const row = await send(operation)
      await deleteOfflineOperation(operation.id)
      results.push({ operation, row: operation.action === 'delete' ? undefined : row })
    } catch (error: any) {
      if (isSessionExpiredError(error)) throw error
      if (isNetworkFailure(error)) break
      const outcome = classifyReplayError(operation.action, error)
      if (outcome.outcome === 'done') {
        await deleteOfflineOperation(operation.id)
        results.push({ operation })
        continue
      }
      await putOfflineOperation({
        ...operation,
        attempts: operation.attempts + 1,
        status: 'failed',
        error: outcome.message,
      })
      results.push({ operation, error: outcome.message })
    }
  }
  notifyOutboxChanged()
  return results
}

export async function discardFailedOfflineOperations(userId: string) {
  const failed = (await getOfflineOperations(userId)).filter(operation => operation.status === 'failed')
  await Promise.all(failed.map(operation => deleteOfflineOperation(operation.id)))
  notifyOutboxChanged()
  return failed
}
