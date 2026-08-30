import { defineStore } from 'pinia'
import { ref } from 'vue'

export type TransactionView = 'expense' | 'income'

export const useTransactionViewStore = defineStore('transactionView', () => {
  const selectedType = ref<TransactionView>('expense')

  function selectType(type: TransactionView) {
    selectedType.value = type
  }

  return { selectedType, selectType }
})
