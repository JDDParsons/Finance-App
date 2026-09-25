import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const table = await readFile(
  new URL('../app/components/cashflow/TransactionsTable.vue', import.meta.url),
  'utf8',
)

test('alternates date groups and their transactions between green and white', () => {
  assert.match(table, /dateGroupIndexMap = computed\(\(\) => new Map/)
  assert.match(table, /isDateGroup\(row\) \? row\.date : \(row\.date \?\? ''\)\.slice\(0, 10\)/)
  assert.match(table, /index % 2 === 0/)
  assert.match(table, /bg-green-50\/70 dark:bg-green-950\/20/)
  assert.match(table, /bg-white dark:bg-gray-900/)
  assert.doesNotMatch(table, /dailySpendingTint/)
})

test('places the add-transaction button before the date label', () => {
  const dateCell = table.match(/<template #entity-cell[\s\S]*?<template #amount-cell/)?.[0] ?? ''
  assert.ok(dateCell.indexOf('<UButton') < dateCell.indexOf('{{ formatDate(row.original.date) }}'))
})
