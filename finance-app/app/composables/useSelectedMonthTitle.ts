import { computed } from 'vue'
import { useFinanceStore } from '~/stores/finance'

export function useSelectedMonthTitle() {
  const store = useFinanceStore()

  const monthTitle = computed(() => {
    const { year, month } = store.selectedMonth
    return new Date(year, month - 1, 1).toLocaleString('default', { month: 'long' })
  })

  return { monthTitle }
}
