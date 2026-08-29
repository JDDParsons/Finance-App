import assert from 'node:assert/strict'
import test from 'node:test'

import { continuousMonthRange, monthStart, previousMonth } from '../utils/monthRange.ts'

test('formats month starts and crosses a year boundary', () => {
  assert.equal(monthStart(2026, 2), '2026-02-01')
  assert.deepEqual(previousMonth(2026, 1), { year: 2025, month: 12 })
  assert.deepEqual(previousMonth(2026, 8), { year: 2026, month: 7 })
})

test('returns every month from earliest activity through the current month', () => {
  const months = continuousMonthRange('2025-11-19', new Date(2026, 2, 15))
  assert.deepEqual(months, [
    { year: 2025, month: 11 },
    { year: 2025, month: 12 },
    { year: 2026, month: 1 },
    { year: 2026, month: 2 },
    { year: 2026, month: 3 },
  ])
})

test('returns only the current month when no earlier activity exists', () => {
  assert.deepEqual(continuousMonthRange(null, new Date(2026, 7, 15)), [{ year: 2026, month: 8 }])
})
