import { defineStore } from 'pinia'
import { ref } from 'vue'
import { transactionDateFromQuery } from '../../utils/cashflowDates.ts'

export const useTransactionCreateModalStore = defineStore('transactionCreateModal', () => {
  const isOpen = ref(false)
  const initialDate = ref<string | null>(null)

  function open(date?: string) {
    const today = new Date().toLocaleDateString('en-CA')
    initialDate.value = transactionDateFromQuery(date, today)
    isOpen.value = true
  }

  function close() {
    isOpen.value = false
    initialDate.value = null
  }

  return { isOpen, initialDate, open, close }
})
