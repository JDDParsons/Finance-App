import { defineStore } from 'pinia'
import { getIncomeByMonth, getBudgetHitsByMonth } from '~/composables/supabase'
import { useFinanceStore } from './finance'

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
]

function offsetMonth(year: number, month: number, delta: number) {
  let m = month - 1 + delta // 0-based
  let y = year + Math.floor(m / 12)
  m = ((m % 12) + 12) % 12
  return { year: y, month: m + 1 }
}

function cacheKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}`
}

export const useSavingsStore = defineStore('savings', () => {
  const financeStore = useFinanceStore()

  // Fetched data cache keyed by "YYYY-MM" (null = fetched but empty, undefined = not fetched)
  const cache = ref<Record<string, { income: number; expenses: number } | null>>({})
  const loadingKeys = ref<Set<string>>(new Set())
  const error = ref<string | null>(null)

  // The 13 month slots (newest first) — extra slot so 12M chart has enough data when current month is excluded
  const trailingMonths = computed(() => {
    const { year, month } = financeStore.selectedMonth
    return Array.from({ length: 13 }, (_, i) => offsetMonth(year, month, -i))
  })

  function monthLabel(year: number, month: number) {
    return `${MONTH_NAMES[month - 1]} ${year}`
  }

  // Current (selected) month totals come directly from the already-loaded financeStore
  const currentIncome = computed(() =>
    financeStore.income.reduce((sum: number, r: any) => sum + (Number(r.amount) || 0), 0)
  )
  const currentExpenses = computed(() =>
    financeStore.budgetHits.reduce((sum: number, r: any) => sum + (Number(r.amount) || 0), 0)
  )

  // Resolved per-month data array for display
  const months = computed(() => {
    return trailingMonths.value.map(({ year, month }, i) => {
      const key = cacheKey(year, month)
      const isCurrent = i === 0
      const isLoading = isCurrent ? financeStore.loading : loadingKeys.value.has(key)

      let income = 0
      let expenses = 0
      let hasData = false

      if (isCurrent) {
        income = currentIncome.value
        expenses = currentExpenses.value
        hasData = income > 0 || expenses > 0
      } else {
        const entry = cache.value[key]
        if (entry !== undefined && entry !== null) {
          income = entry.income
          expenses = entry.expenses
          hasData = income > 0 || expenses > 0
        }
      }

      return {
        year,
        month,
        key,
        label: monthLabel(year, month),
        isCurrent,
        income,
        expenses,
        savings: income - expenses,
        hasData,
        loading: isLoading,
        fetched: isCurrent || cache.value[key] !== undefined
      }
    })
  })

  const grandTotal = computed(() =>
    months.value.reduce((sum, m) => sum + (m.hasData ? m.savings : 0), 0)
  )

  async function fetchMonth(year: number, month: number, force = false) {
    const key = cacheKey(year, month)
    if (!force && cache.value[key] !== undefined) return

    loadingKeys.value = new Set([...loadingKeys.value, key])
    try {
      const [incomeRows, expenseRows] = await Promise.all([
        getIncomeByMonth(year, month),
        getBudgetHitsByMonth(year, month)
      ])
      const totalIncome = incomeRows.reduce((sum: number, r: any) => sum + (Number(r.amount) || 0), 0)
      const totalExpenses = expenseRows.reduce((sum: number, r: any) => sum + (Number(r.amount) || 0), 0)
      cache.value = { ...cache.value, [key]: { income: totalIncome, expenses: totalExpenses } }
    } catch (e: any) {
      error.value = e?.message || 'Failed to load savings data.'
      cache.value = { ...cache.value, [key]: null }
    } finally {
      const next = new Set(loadingKeys.value)
      next.delete(key)
      loadingKeys.value = next
    }
  }

  async function fetchAll(force = false) {
    // Fetch all non-current months in the trailing window in parallel
    const toFetch = trailingMonths.value.slice(1)
    await Promise.all(toFetch.map(({ year, month }) => fetchMonth(year, month, force)))
  }

  // Re-fetch when selected month changes
  watch(() => financeStore.selectedMonth, () => fetchAll(), { deep: true })

  function invalidateCache() {
    cache.value = {}
  }

  return {
    months,
    grandTotal,
    error,
    fetchAll,
    invalidateCache
  }
})
