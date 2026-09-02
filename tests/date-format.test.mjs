import assert from 'node:assert/strict'
import test from 'node:test'

import { formatDashboardPeriodLabel, formatWeekdayOrdinal } from '../utils/dateFormat.ts'

test('formats a date as its weekday and ordinal day', () => {
  assert.equal(formatWeekdayOrdinal(new Date(2026, 8, 2)), 'Wednesday the 2nd')
})

test('uses the correct ordinal suffix for regular and teen dates', () => {
  assert.equal(formatWeekdayOrdinal(new Date(2026, 8, 1)), 'Tuesday the 1st')
  assert.equal(formatWeekdayOrdinal(new Date(2026, 8, 3)), 'Thursday the 3rd')
  assert.equal(formatWeekdayOrdinal(new Date(2026, 8, 4)), 'Friday the 4th')
  assert.equal(formatWeekdayOrdinal(new Date(2026, 8, 11)), 'Friday the 11th')
  assert.equal(formatWeekdayOrdinal(new Date(2026, 8, 12)), 'Saturday the 12th')
  assert.equal(formatWeekdayOrdinal(new Date(2026, 8, 13)), 'Sunday the 13th')
  assert.equal(formatWeekdayOrdinal(new Date(2026, 8, 21)), 'Monday the 21st')
})

test('describes previously selected months relative to today', () => {
  const today = new Date(2026, 8, 2)

  assert.equal(formatDashboardPeriodLabel(2026, 9, today), 'Wednesday the 2nd')
  assert.equal(formatDashboardPeriodLabel(2026, 8, today), 'Last month')
  assert.equal(formatDashboardPeriodLabel(2026, 7, today), '2 months ago')
  assert.equal(formatDashboardPeriodLabel(2025, 12, today), '9 months ago')
})
