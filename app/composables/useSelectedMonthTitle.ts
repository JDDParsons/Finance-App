import { computed } from 'vue'
import { useFinanceStore } from '~/stores/finance'

const MONTH_COLORS: Record<number, string> = {
  1:  '#add8e6', // Jan - pale blue
  2:  '#f9a8d4', // Feb - pink
  3:  '#86efac', // Mar - green
  4:  '#60a5fa', // Apr - blue
  5:  '#d8b4fe', // May - pale purple
  6:  '#fdba74', // Jun - pale orange
  7:  '#a855f7', // Jul - purple
  8:  '#ca8a04', // Aug - mustard yellow
  9:  '#7dd3fc', // Sep - sky blue
  10: '#fb923c', // Oct - amber (unspecified)
  11: '#ddd6fe', // Nov - pale lavender
  12: '#fca5a5', // Dec - pale red
}

export function useSelectedMonthTitle() {
  const store = useFinanceStore()

  const monthTitle = computed(() => {
    const { year, month } = store.selectedMonth
    return new Date(year, month - 1, 1).toLocaleString('default', { month: 'long' })
  })

  const monthColor = computed(() => MONTH_COLORS[store.selectedMonth.month] ?? '#60a5fa')

  return { monthTitle, monthColor }
}
