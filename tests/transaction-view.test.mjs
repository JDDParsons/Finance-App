import assert from 'node:assert/strict'
import test from 'node:test'
import { createPinia, setActivePinia } from 'pinia'

import { useTransactionViewStore } from '../app/stores/transactionView.ts'

test('shares the selected transaction type between page consumers', () => {
  setActivePinia(createPinia())
  const cashflowView = useTransactionViewStore()
  const budgetView = useTransactionViewStore()
  const createTransactionView = useTransactionViewStore()

  cashflowView.selectType('income')
  assert.equal(budgetView.selectedType, 'income')
  assert.equal(createTransactionView.selectedType, 'income')

  createTransactionView.selectType('expense')
  assert.equal(cashflowView.selectedType, 'expense')
  assert.equal(budgetView.selectedType, 'expense')
})

test('defaults to the expense view for a new app session', () => {
  setActivePinia(createPinia())
  assert.equal(useTransactionViewStore().selectedType, 'expense')
})
