import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const table = await readFile(
  new URL('../app/components/cashflow/TransactionsTable.vue', import.meta.url),
  'utf8',
)

test('grades date groups and their transactions from Sunday green to Saturday white', () => {
  assert.match(table, /isDateGroup\(row\) \? row\.date : \(row\.date \?\? ''\)\.slice\(0, 10\)/)
  assert.match(table, /getUTCDay\(\)/)
  assert.match(table, /progressToWhite = weekday \/ 6/)
  assert.match(table, /saturation = Math\.round\(76 \* \(1 - progressToWhite\)\)/)
  assert.match(table, /lightness = Math\.round\(92 \+ \(8 \* progressToWhite\)\)/)
  assert.match(table, /tr: \(row: any\) => weekdayFillStyle\(row\.original as TableRow\)/)
})

test('places the add-transaction button before the date label', () => {
  const dateCell = table.match(/<template #entity-cell[\s\S]*?<template #amount-cell/)?.[0] ?? ''
  assert.ok(dateCell.indexOf('<UButton') < dateCell.indexOf('{{ formatDate(row.original.date) }}'))
})
