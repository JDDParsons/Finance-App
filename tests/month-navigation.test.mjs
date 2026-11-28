import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { adjacentMonth, monthPickerLabel } from '../utils/monthNavigation.ts'

const now = new Date(2026, 10, 28)
const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8')
// Out of order on purpose.
const available = [
  { year: 2026, month: 9 },
  { year: 2025, month: 12 },
  { year: 2027, month: 1 },
  { year: 2026, month: 10 },
]
const step = (year, month, direction, months = available) =>
  adjacentMonth(months, { year, month }, direction, now)

test('steps to the nearest month with data, across years and gaps', () => {
  assert.deepEqual(step(2026, 10, -1), { year: 2026, month: 9 })
  assert.deepEqual(step(2026, 9, -1), { year: 2025, month: 12 })
  assert.deepEqual(step(2025, 12, 1), { year: 2026, month: 9 })
})

test('the current month can be opened even without data', () => {
  assert.deepEqual(step(2026, 10, 1), { year: 2026, month: 11 })
  assert.deepEqual(step(2027, 1, -1), { year: 2026, month: 11 })
  assert.deepEqual(step(2026, 11, 1), { year: 2027, month: 1 })
  assert.deepEqual(step(2026, 8, 1, []), { year: 2026, month: 11 })
})

test('there is nowhere to go past either end', () => {
  assert.equal(step(2025, 12, -1), null)
  assert.equal(step(2027, 1, 1), null)
  assert.equal(step(2026, 11, -1, []), null)
  assert.equal(step(2026, 11, 1, []), null)
})

test('names the month, adding the year only for other years', () => {
  assert.equal(monthPickerLabel({ year: 2026, month: 9 }, now), 'September')
  assert.equal(monthPickerLabel({ year: 2025, month: 12 }, now), 'December 2025')
})

test('the month picker is arrows around the month, without a popover', async () => {
  const picker = await read('app/components/MonthSelector.vue')

  assert.match(picker, /aria-label="Previous month"[\s\S]*monthPickerLabel\(shown\)[\s\S]*aria-label="Next month"/)
  assert.doesNotMatch(picker, /UPopover|MONTHS_ABBR/)
})

test('the home header holds the greeting, and the page body the picker even without data', async () => {
  const homePage = await read('app/pages/home.vue')
  const header = await read('app/components/AppHeader.vue')

  assert.match(homePage, /<MonthSelector \/>\s*<\/div>\s*<template v-if="store\.loading \|\| hasData">/)
  assert.match(header, /<slot name="title">\s*<MonthSelector v-if="showMonth" \/>\s*<\/slot>/)
  assert.doesNotMatch(header, /Budgify.*\.png/)
  // The two desktop classes once ran together, so neither applied.
  assert.match(homePage, /lg:grid-rows-\[auto_1fr\] lg:pb-6/)
})

test('a slow month load cannot overwrite a later month change', async () => {
  const appData = await read('app/composables/useAppData.ts')

  assert.match(appData, /^let latestMonthRequest = 0$/m)
  assert.match(appData, /const monthRequest = \+\+latestMonthRequest/)
  assert.match(appData, /await getBootstrap\(year, month\)\s+if \(isSuperseded\(\)\) return\s+applyPayload/)
  assert.match(appData, /if \(monthRequest !== latestMonthRequest\) return\s+applyPayload/)
})
