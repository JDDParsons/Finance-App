import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const table = await readFile(
  new URL('../app/components/cashflow/TransactionsTable.vue', import.meta.url),
  'utf8',
)

test('grades date groups and their transactions from Sunday white to Saturday green', () => {
  assert.match(table, /isDateGroup\(row\) \? row\.date : \(row\.date \?\? ''\)\.slice\(0, 10\)/)
  assert.match(table, /getUTCDay\(\)/)
  assert.match(table, /progressToGreen = weekday \/ 6/)
  assert.match(table, /saturation = Math\.round\(76 \* progressToGreen\)/)
  assert.match(table, /lightness = Math\.round\(100 - \(8 \* progressToGreen\)\)/)
  assert.match(table, /backgroundColor: `hsl\(142 \$\{saturation\}% \$\{lightness\}%\)`/)
  assert.match(table, /tr: \(row: any\) => weekdayFillStyle\(row\.original as TableRow\)/)
})

test('uses a solid green divider at each Saturday-to-Sunday week boundary', () => {
  assert.match(table, /isSaturday = new Date\(`\$\{row\.date\}T00:00:00Z`\)\.getUTCDay\(\) === 6/)
  assert.match(table, /border-t border-solid border-green-400/)
  assert.match(table, /\? dateDividerClass\(original\)/)
})

test('lightens an entire date group on hover', () => {
  assert.match(table, /isHovered \? 'brightness-105' : ''/)
  assert.doesNotMatch(table, /brightness-95/)
})

test('renders the table header with a solid green fill and white text', () => {
  assert.match(table, /th: 'py-2\.5 bg-primary-500 text-white'/)
})

test('places the add-transaction button before the date label', () => {
  const dateCell = table.match(/<template #entity-cell[\s\S]*?<template #amount-cell/)?.[0] ?? ''
  assert.ok(dateCell.indexOf('<UButton') < dateCell.indexOf('{{ formatDate(row.original.date) }}'))
  assert.match(dateCell, /color="primary"/)
  assert.match(dateCell, /variant="solid"/)
  assert.match(dateCell, /bg-primary-500 text-white hover:bg-primary-600/)
})
