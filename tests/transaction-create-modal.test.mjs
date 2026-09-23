import assert from 'node:assert/strict'
import test from 'node:test'
import { createPinia, setActivePinia } from 'pinia'

import { useTransactionCreateModalStore } from '../app/stores/transactionCreateModal.ts'

test('opens the transaction creator with a selected date', () => {
  setActivePinia(createPinia())
  const modal = useTransactionCreateModalStore()

  modal.open('2026-09-12')

  assert.equal(modal.isOpen, true)
  assert.equal(modal.initialDate, '2026-09-12')
})

test('falls back to today for an invalid selected date and clears it on close', () => {
  setActivePinia(createPinia())
  const modal = useTransactionCreateModalStore()
  const today = new Date().toLocaleDateString('en-CA')

  modal.open('2026-02-30')
  assert.equal(modal.initialDate, today)

  modal.close()
  assert.equal(modal.isOpen, false)
  assert.equal(modal.initialDate, null)
})
