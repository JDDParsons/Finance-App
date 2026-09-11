import { getSupabase } from '~/composables/supabase/client'
import { apiFetch } from '~/composables/useApiToken'
import type { OfflineCreateKind, OfflineCreateOperation, OfflineReplayResult } from '~/types/offline'
import { deleteOfflineCreate, getOfflineCreates, putOfflineCreate } from './offlineFinanceCache.client'
import { buildOptimisticRow } from '../../utils/offlineRows'

const ENDPOINTS: Record<OfflineCreateKind, string> = {
  expense: '/api/hits',
  income: '/api/income',
  transfer: '/api/transfers',
}

function notifyOutboxChanged() {
  window.dispatchEvent(new CustomEvent('budgify-outbox-changed'))
}

function errorMessage(error: any) {
  return error?.data?.message || error?.statusMessage || error?.message || 'Could not sync this transaction.'
}

function isNetworkFailure(error: any) {
  return !navigator.onLine || (!error?.response && !error?.status && !error?.statusCode)
}

export async function createOrQueueOffline(
  kind: OfflineCreateKind,
  payload: Record<string, unknown>
) {
  const operationId = crypto.randomUUID()
  try {
    return await apiFetch<any>(ENDPOINTS[kind], {
      method: 'POST',
      body: { ...payload, operationId },
    })
  } catch (error: any) {
    if (!isNetworkFailure(error)) throw error
    const { data: { session } } = await getSupabase().auth.getSession()
    if (!session?.user.id) throw new Error('Not authenticated')
    const operation: OfflineCreateOperation = {
      id: operationId,
      userId: session.user.id,
      kind,
      payload,
      createdAt: new Date().toISOString(),
      attempts: 0,
      status: 'pending',
      error: null,
    }
    await putOfflineCreate(operation)
    notifyOutboxChanged()
    return buildOptimisticRow(kind, operationId, session.user.id, payload)
  }
}

export async function replayOfflineCreates(userId: string, retryFailed = false): Promise<OfflineReplayResult[]> {
  const results: OfflineReplayResult[] = []
  for (const operation of await getOfflineCreates(userId)) {
    if (operation.status === 'failed' && !retryFailed) continue
    try {
      const row = await apiFetch<any>(ENDPOINTS[operation.kind], {
        method: 'POST',
        body: { ...operation.payload, operationId: operation.id },
      })
      await deleteOfflineCreate(operation.id)
      results.push({ operation, row })
    } catch (error: any) {
      const status = error?.statusCode ?? error?.status ?? error?.response?.status
      if (status === 401) throw error
      if (isNetworkFailure(error)) break
      const message = errorMessage(error)
      await putOfflineCreate({
        ...operation,
        attempts: operation.attempts + 1,
        status: 'failed',
        error: message,
      })
      results.push({ operation, error: message })
    }
  }
  notifyOutboxChanged()
  return results
}

export async function discardFailedOfflineCreates(userId: string) {
  const failed = (await getOfflineCreates(userId)).filter(operation => operation.status === 'failed')
  await Promise.all(failed.map(operation => deleteOfflineCreate(operation.id)))
  notifyOutboxChanged()
  return failed
}
