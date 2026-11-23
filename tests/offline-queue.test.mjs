import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import {
  classifyReplayError,
  hasQueuedOperation,
  MISSING_ROW_MESSAGE,
  normalizeOperation,
  planDelete,
  planEdit,
  sortForReplay,
} from '../utils/offlineQueue.ts'
import { buildOptimisticEdit } from '../utils/offlineRows.ts'

const base = { userId: 'user', now: '2026-11-22T10:00:00.000Z' }

function operation(overrides) {
  return {
    id: 'op-1', userId: 'user', entity: 'expense', action: 'create', targetId: 'op-1',
    payload: { amount: '5.00', date: '2026-11-20', entity: 'Cafe' },
    createdAt: '2026-11-22T09:00:00.000Z', attempts: 0, status: 'pending', error: null,
    ...overrides,
  }
}

test('entries saved before Phase 2 are read as create operations', () => {
  const legacy = normalizeOperation({
    id: 'op-1', userId: 'user', kind: 'income', payload: { amount: 1 },
    createdAt: '2026-11-20T00:00:00.000Z', attempts: 2, status: 'failed', error: 'nope',
  })
  assert.equal(legacy.entity, 'income')
  assert.equal(legacy.action, 'create')
  assert.equal(legacy.targetId, 'op-1')
  assert.equal(legacy.status, 'failed')
})

test('an edit of an unsynced create is merged into the create', () => {
  const queue = [operation({})]
  const change = planEdit(queue, { ...base, id: 'op-2', entity: 'expense', targetId: 'op-1', payload: { amount: '9.00' } })

  assert.deepEqual(change.remove, [])
  assert.equal(change.put.length, 1)
  assert.equal(change.put[0].id, 'op-1')
  assert.equal(change.put[0].action, 'create')
  assert.equal(change.put[0].createdAt, '2026-11-22T09:00:00.000Z')
  assert.deepEqual(change.put[0].payload, { amount: '9.00', date: '2026-11-20', entity: 'Cafe' })
})

test('editing a failed entry resets it so it is retried', () => {
  const queue = [operation({ status: 'failed', error: 'bad budget', attempts: 1 })]
  const [merged] = planEdit(queue, { ...base, id: 'x', entity: 'expense', targetId: 'op-1', payload: { budgetId: null } }).put
  assert.equal(merged.status, 'pending')
  assert.equal(merged.error, null)
})

test('a second edit of a synced row replaces the first queued edit', () => {
  const first = planEdit([], { ...base, id: 'edit-1', entity: 'income', targetId: 'row-1', payload: { amount: 10, entity: 'Pay' } })
  assert.equal(first.put[0].action, 'edit')
  assert.equal(first.put[0].targetId, 'row-1')

  const second = planEdit(first.put, { ...base, id: 'edit-2', entity: 'income', targetId: 'row-1', payload: { amount: 20 } })
  assert.equal(second.put.length, 1)
  assert.equal(second.put[0].id, 'edit-1')
  assert.deepEqual(second.put[0].payload, { amount: 20, entity: 'Pay' })
})

test('edits for the same id in a different entity are not merged', () => {
  const queue = [operation({ entity: 'income', targetId: 'same', id: 'same' })]
  const change = planEdit(queue, { ...base, id: 'e', entity: 'expense', targetId: 'same', payload: {} })
  assert.equal(change.put[0].id, 'e')
  assert.equal(hasQueuedOperation(queue, 'expense', 'same'), false)
  assert.equal(hasQueuedOperation(queue, 'income', 'same'), true)
})

test('deleting an unsynced create removes it and queues nothing', () => {
  const change = planDelete([operation({})], { ...base, id: 'd', entity: 'expense', targetId: 'op-1' })
  assert.deepEqual(change, { put: [], remove: ['op-1'] })
})

test('a delete replaces queued edits of the row (a delete beats an edit)', () => {
  const edit = operation({ id: 'edit-1', action: 'edit', targetId: 'row-1' })
  const change = planDelete([edit], { ...base, id: 'd', entity: 'expense', targetId: 'row-1' })
  assert.deepEqual(change.remove, ['edit-1'])
  assert.equal(change.put.length, 1)
  assert.equal(change.put[0].action, 'delete')
  assert.equal(change.put[0].targetId, 'row-1')
})

test('deleting twice queues one delete, and edits after a delete are ignored', () => {
  const queued = planDelete([], { ...base, id: 'd1', entity: 'transfer', targetId: 'row-1' }).put
  assert.deepEqual(planDelete(queued, { ...base, id: 'd2', entity: 'transfer', targetId: 'row-1' }), { put: [], remove: [] })
  assert.deepEqual(
    planEdit(queued, { ...base, id: 'e', entity: 'transfer', targetId: 'row-1', payload: { amount: 1 } }),
    { put: [], remove: [] }
  )
})

test('replay runs oldest first, and create before edit before delete at the same time', () => {
  const sorted = sortForReplay([
    operation({ id: 'late', createdAt: '2026-11-22T11:00:00.000Z' }),
    operation({ id: 'del', action: 'delete', createdAt: '2026-11-22T09:00:00.000Z' }),
    operation({ id: 'edit', action: 'edit', createdAt: '2026-11-22T09:00:00.000Z' }),
    operation({ id: 'create', createdAt: '2026-11-22T09:00:00.000Z' }),
    operation({ id: 'early', createdAt: '2026-11-22T08:00:00.000Z' }),
  ])
  assert.deepEqual(sorted.map(item => item.id), ['early', 'create', 'edit', 'del', 'late'])
})

test('conflict rules: deleting a missing row succeeds, editing a missing row is dropped', () => {
  assert.deepEqual(classifyReplayError('delete', { statusCode: 404 }), { outcome: 'done' })
  assert.deepEqual(
    classifyReplayError('edit', { statusCode: 404 }),
    { outcome: 'failed', message: MISSING_ROW_MESSAGE }
  )
  assert.equal(classifyReplayError('edit', { response: { status: 404 } }).outcome, 'failed')
  assert.deepEqual(
    classifyReplayError('create', { statusCode: 400, data: { message: 'Bad budget.' } }),
    { outcome: 'failed', message: 'Bad budget.' }
  )
  assert.equal(classifyReplayError('delete', { statusCode: 500 }).outcome, 'failed')
})

test('an optimistic edit keeps the original id, author and notes unless changed', () => {
  const existing = {
    id: 'row-1', client_operation_id: 'client-1', created_at: '2026-11-01T00:00:00.000Z',
    user_id: 'author', notes: 'keep me', type: 'Expense',
  }
  const edited = buildOptimisticEdit('expense', existing, 'me', 'row-1', {
    amount: '7.00', date: '2026-11-21', entity: 'Shop', budgetId: 'b', accountId: 'a',
  })
  assert.equal(edited.id, 'row-1')
  assert.equal(edited.user_id, 'author')
  assert.equal(edited.created_at, '2026-11-01T00:00:00.000Z')
  assert.equal(edited.notes, 'keep me')
  assert.equal(edited.amount, '7.00')
  assert.equal(edited.pending_sync, true)

  const cleared = buildOptimisticEdit('expense', existing, 'me', 'row-1', { amount: '7.00', date: '2026-11-21', notes: null })
  assert.equal(cleared.notes, null)
})

test('update routes answer 404 for a row that no longer exists', async () => {
  const hits = await readFile(new URL('../server/utils/supabase/hits.ts', import.meta.url), 'utf8')
  const missing = await readFile(new URL('../server/utils/supabase/missing-row.ts', import.meta.url), 'utf8')

  assert.equal((hits.match(/throwIfRowMissing\(error\)/g) ?? []).length, 3)
  assert.match(missing, /PGRST116/)
  assert.match(missing, /statusCode: 404/)
})

test('recent months are pre-cached without changing the month opened on launch', async () => {
  const appData = await readFile(new URL('../app/composables/useAppData.ts', import.meta.url), 'utf8')
  const cache = await readFile(new URL('../app/utils/offlineFinanceCache.client.ts', import.meta.url), 'utf8')

  assert.match(appData, /PRECACHE_MONTH_COUNT = 3/)
  assert.match(appData, /precacheRecentMonths/)
  assert.match(appData, /saveOfflineMonthSnapshot/)
  const saveMonth = cache.match(/export async function saveOfflineMonthSnapshot[\s\S]*?\n}/)?.[0] ?? ''
  assert.ok(saveMonth.length > 0)
  assert.doesNotMatch(saveMonth, /preferences/)
})
