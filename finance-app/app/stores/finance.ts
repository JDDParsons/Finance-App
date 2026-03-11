import { defineStore } from 'pinia'
import {
  getBudgetsByMonth, getBudgetHitsByMonth, getIncomeByMonth,
  getAvailableBudgetMonths,
  insertIncome, deleteIncome,
  createBudgetHit, deleteBudgetHit,
  createBudget
} from '../composables/supabase'

export const useFinanceStore = defineStore('finance', () => {
  const _now = new Date()
  const selectedMonth = ref({ year: _now.getFullYear(), month: _now.getMonth() + 1 })

  const availableMonths = ref<{ year: number; month: number }[]>([])
  const budgets = ref<any[]>([])
  const budgetHits = ref<any[]>([])
  const income = ref<any[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // ── helpers ──────────────────────────────────────────────────────────────

  function enrichBudgets(rawBudgets: any[], hits: any[]) {
    const { year, month } = selectedMonth.value

    return rawBudgets.map(b => {
      const budgetHitList = hits.filter(h => h.budget_id === b.id)
      const totalHitAmount = budgetHitList.reduce((sum, h) => {
        const d = new Date((h.date as string).replace(/-/g, '/'))
        const matches = d.getFullYear() === year && (d.getMonth() + 1) === month
        return matches ? sum + (Number(h.amount) || 0) : sum
      }, 0)
      const progress = b.currentPeriod?.amount
        ? (totalHitAmount / b.currentPeriod.amount) * 100
        : 0
      return { ...b, hits: budgetHitList, totalHitAmount, numberOfHits: budgetHitList.length, progress }
    })
  }

  // ── fetch ─────────────────────────────────────────────────────────────────

  async function fetchAll() {
    try {
      loading.value = true
      error.value = null
      const { year, month } = selectedMonth.value
      const [rawBudgets, hits, inc, avail] = await Promise.all([
        getBudgetsByMonth(year, month),
        getBudgetHitsByMonth(year, month),
        getIncomeByMonth(year, month),
        getAvailableBudgetMonths()
      ])
      availableMonths.value = avail
      budgetHits.value = hits
      income.value = inc
      budgets.value = enrichBudgets(rawBudgets, hits)
    } catch (err: any) {
      error.value = err?.message || 'Failed to load data'
    } finally {
      loading.value = false
    }
  }

  async function refreshBudgets() {
    const { year, month } = selectedMonth.value
    const [rawBudgets, hits] = await Promise.all([getBudgetsByMonth(year, month), getBudgetHitsByMonth(year, month)])
    budgetHits.value = hits
    budgets.value = enrichBudgets(rawBudgets, hits)
  }

  // ── month navigation ──────────────────────────────────────────────────────

  function monthKey(year: number, month: number) { return year * 100 + month }

  const hasPrev = computed(() => {
    const { year, month } = selectedMonth.value
    const cur = monthKey(year, month)
    return availableMonths.value.some(m => monthKey(m.year, m.month) < cur)
  })

  const hasNext = computed(() => {
    const { year, month } = selectedMonth.value
    const cur = monthKey(year, month)
    return availableMonths.value.some(m => monthKey(m.year, m.month) > cur)
  })

  async function setMonth(year: number, month: number) {
    selectedMonth.value = { year, month }
    await fetchAll()
  }

  function prevMonth() {
    const { year, month } = selectedMonth.value
    const cur = monthKey(year, month)
    const prev = availableMonths.value
      .filter(m => monthKey(m.year, m.month) < cur)
      .at(-1)
    if (prev) setMonth(prev.year, prev.month)
  }

  function nextMonth() {
    const { year, month } = selectedMonth.value
    const cur = monthKey(year, month)
    const next = availableMonths.value
      .find(m => monthKey(m.year, m.month) > cur)
    if (next) setMonth(next.year, next.month)
  }

  // ── income ────────────────────────────────────────────────────────────────

  async function addIncome(amount: number, date: string, note: string) {
    const row = await insertIncome(amount, date, note)
    income.value = [row, ...income.value].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )
  }

  async function removeIncome(id: string) {
    await deleteIncome(id)
    income.value = income.value.filter(r => r.id !== id)
  }

  // ── expenses ──────────────────────────────────────────────────────────────

  async function addExpense(budgetId: string | null, date: string, amount: string, note: string) {
    const hit = await createBudgetHit(budgetId, date, amount, note)
    budgetHits.value = [hit, ...budgetHits.value]
    budgets.value = enrichBudgets(budgets.value, budgetHits.value)
  }

  async function removeExpense(id: string) {
    await deleteBudgetHit(id)
    budgetHits.value = budgetHits.value.filter(h => h.id !== id)
    budgets.value = enrichBudgets(budgets.value, budgetHits.value)
  }

  // ── budgets ───────────────────────────────────────────────────────────────

  async function addBudget(name: string, amount: string) {
    await createBudget(name, amount)
    await refreshBudgets()
  }

  return {
    selectedMonth,
    availableMonths,
    hasPrev,
    hasNext,
    budgets,
    budgetHits,
    income,
    loading,
    error,
    fetchAll,
    refreshBudgets,
    setMonth,
    prevMonth,
    nextMonth,
    addIncome,
    removeIncome,
    addExpense,
    removeExpense,
    addBudget
  }
})
