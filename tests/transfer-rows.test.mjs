import test from 'node:test'
import assert from 'node:assert/strict'
import { reconcileTransferUpdate, removeTransferRow, sortTransferRows } from '../utils/transferRows.ts'

const rows = [
  { id: 'one', date: '2026-09-10', created_at: '2026-09-10T12:00:00Z', amount: 10 },
  { id: 'two', date: '2026-09-20', created_at: '2026-09-20T12:00:00Z', amount: 20 },
]

test('sorts transfers newest first', () => {
  assert.deepEqual(sortTransferRows(rows).map(row => row.id), ['two', 'one'])
})

test('replaces and re-sorts an edited transfer in the selected month', () => {
  const updated = { ...rows[0], date: '2026-09-25', amount: 99 }
  const result = reconcileTransferUpdate(rows, updated, { year: 2026, month: 9 })
  assert.deepEqual(result.map(row => row.id), ['one', 'two'])
  assert.equal(result[0].amount, 99)
})

test('removes an edited transfer that moves outside the selected month', () => {
  const updated = { ...rows[0], date: '2026-10-01' }
  assert.deepEqual(reconcileTransferUpdate(rows, updated, { year: 2026, month: 9 }).map(row => row.id), ['two'])
})

test('removes a deleted transfer', () => {
  assert.deepEqual(removeTransferRow(rows, 'one').map(row => row.id), ['two'])
})
