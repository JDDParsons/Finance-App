import { defineStore } from 'pinia'
import { ref } from 'vue'
import { transactionDateFromQuery } from '../../utils/cashflowDates.ts'

export const useTransactionCreateModalStore = defineStore('transactionCreateModal', () => {
  const isOpen = ref(false)
  const initialDate = ref<string | null>(null)
  const initialBudgetId = ref<string | null>(null)

  function open(date?: string, budgetId?: string) {
    const today = new Date().toLocaleDateString('en-CA')
    initialDate.value = transactionDateFromQuery(date, today)
    initialBudgetId.value = budgetId ?? null
    isOpen.value = true
  }

  function close() {
    isOpen.value = false
    initialDate.value = null
    initialBudgetId.value = null
  }

  return { isOpen, initialDate, initialBudgetId, open, close }
})
