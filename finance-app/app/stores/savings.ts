import { defineStore } from 'pinia'
import { getIncomeByMonth, getBudgetHitsByMonth } from '../composables/supabase'
import { useFinanceStore } from './finance'

export const useSavingsStore = defineStore('savings', () => {
  const financeStore = useFinanceStore()

  const income = ref<number>(0)
  const expenses = ref<number>(0)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Cache fetched results by "YYYY-MM" key so navigating back doesn't re-fetch
  const cache = ref<Record<string, { income: number; expenses: number }>>({})

  const previousMonth = computed(() => {
    const { year, month } = financeStore.selectedMonth
    if (month === 1) return { year: year - 1, month: 12 }
    return { year, month: month - 1 }
  })

  // Current month — derived from the already-loaded financeStore data
  const currentIncome = computed(() =>
    financeStore.income.reduce((sum: number, r: any) => sum + (Number(r.amount) || 0), 0)
  )
  const currentExpenses = computed(() =>
    financeStore.budgetHits.reduce((sum: number, r: any) => sum + (Number(r.amount) || 0), 0)
  )
  const currentSavings = computed(() => currentIncome.value - currentExpenses.value)

  // Previous month left-over
  const savings = computed(() => income.value - expenses.value)

  // Grand total: what remains this month + what was saved last month
  const grandTotal = computed(() => currentSavings.value + savings.value)

  function cacheKey(year: number, month: number) {
    return `${year}-${String(month).padStart(2, '0')}`
  }

  async function fetchPrevMonthData(force = false) {
    const { year, month } = previousMonth.value
    const key = cacheKey(year, month)

    if (!force && cache.value[key]) {
      income.value = cache.value[key].income
      expenses.value = cache.value[key].expenses
      return
    }

    loading.value = true
    error.value = null
    try {
      const [incomeRows, expenseRows] = await Promise.all([
        getIncomeByMonth(year, month),
        getBudgetHitsByMonth(year, month)
      ])
      const totalIncome = incomeRows.reduce((sum: number, r: any) => sum + (Number(r.amount) || 0), 0)
      const totalExpenses = expenseRows.reduce((sum: number, r: any) => sum + (Number(r.amount) || 0), 0)

      income.value = totalIncome
      expenses.value = totalExpenses
      cache.value[key] = { income: totalIncome, expenses: totalExpenses }
    } catch (e: any) {
      error.value = e?.message || 'Failed to load savings data.'
    } finally {
      loading.value = false
    }
  }

  function invalidateCache() {
    cache.value = {}
  }

  watch(() => financeStore.selectedMonth, () => fetchPrevMonthData(), { deep: true })

  return {
    income,
    expenses,
    savings,
    currentIncome,
    currentExpenses,
    currentSavings,
    grandTotal,
    loading,
    error,
    previousMonth,
    fetchPrevMonthData,
    invalidateCache
  }
})
