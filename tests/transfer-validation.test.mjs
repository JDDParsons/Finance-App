import test from 'node:test'
import assert from 'node:assert/strict'
import { validateTransferInput } from '../server/utils/transfer.ts'

test('normalizes a valid transfer', () => {
  assert.deepEqual(validateTransferInput({
    fromAccountId: ' source ', toAccountId: 'destination', amount: '12.50', date: '2026-09-01',
  }), { fromAccountId: 'source', toAccountId: 'destination', amount: 12.5, date: '2026-09-01' })
})

test('rejects incomplete or identical transfer accounts', () => {
  assert.throws(() => validateTransferInput({ toAccountId: 'two', amount: 10, date: '2026-09-01' }), /both/)
  assert.throws(() => validateTransferInput({ fromAccountId: 'one', toAccountId: 'one', amount: 10, date: '2026-09-01' }), /different/)
})

test('rejects invalid transfer amounts and dates', () => {
  const base = { fromAccountId: 'one', toAccountId: 'two' }
  assert.throws(() => validateTransferInput({ ...base, amount: 0, date: '2026-09-01' }), /greater than zero/)
  assert.throws(() => validateTransferInput({ ...base, amount: 'nope', date: '2026-09-01' }), /greater than zero/)
  assert.throws(() => validateTransferInput({ ...base, amount: 10, date: 'September 1' }), /valid transfer date/)
  assert.throws(() => validateTransferInput({ ...base, amount: 10, date: '2026-02-31' }), /valid transfer date/)
})
