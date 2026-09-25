import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const table = await readFile(
  new URL('../app/components/cashflow/TransactionsTable.vue', import.meta.url),
  'utf8',
)

test('colors date groups from expense totals using the daily spending scale', () => {
  assert.match(table, /import \{ dailySpendingTint \} from '\.\.\/\.\.\/\.\.\/utils\/dailySpending'/)
  assert.match(table, /\.filter\(transaction => transaction\.type === 'expense'\)/)
  assert.match(table, /backgroundColor: dailySpendingTint\(expenseTotal, dailyBudgetedIncome\.value\)/)
  assert.match(table, /tr: \(row: any\) => dateGroupStyle\(row\.original as TableRow\)/)
})

test('places the add-transaction button before the date label', () => {
  const dateCell = table.match(/<template #entity-cell[\s\S]*?<template #amount-cell/)?.[0] ?? ''
  assert.ok(dateCell.indexOf('<UButton') < dateCell.indexOf('{{ formatDate(row.original.date) }}'))
})
