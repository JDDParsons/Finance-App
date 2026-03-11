import { defineStore } from 'pinia'
import {
  getBudgets, getBudgetHits, getIncome,
  insertIncome, deleteIncome,
  createBudgetHit, deleteBudgetHit,
  createBudget
} from '../composables/supabase'

export const useFinanceStore = defineStore('finance', () => {
  const budgets = ref<any[]>([])
  const budgetHits = ref<any[]>([])
  const income = ref<any[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // ── helpers ──────────────────────────────────────────────────────────────

  function enrichBudgets(rawBudgets: any[], hits: any[]) {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth()

    return rawBudgets.map(b => {
      const budgetHitList = hits.filter(h => h.budget_id === b.id)
      const totalHitAmount = budgetHitList.reduce((sum, h) => {
        const d = new Date((h.date as string).replace(/-/g, '/'))
        const isCurrent =
          d.getFullYear() === currentYear && d.getMonth() === currentMonth
        return isCurrent ? sum + (Number(h.amount) || 0) : sum
      }, 0)
      const progress = b.currentPeriod?.amount
        ? (totalHitAmount / b.currentPeriod.amount) * 100
        : 0
      return {
        ...b,
        hits: budgetHitList,
        totalHitAmount,
        numberOfHits: budgetHitList.length,
        progress
      }
    })
  }

  // ── fetch ─────────────────────────────────────────────────────────────────

  async function fetchAll() {
    try {
      loading.value = true
      error.value = null
      const [rawBudgets, hits, inc] = await Promise.all([
        getBudgets(),
        getBudgetHits(),
        getIncome()
      ])
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
    const [rawBudgets, hits] = await Promise.all([getBudgets(), getBudgetHits()])
    budgetHits.value = hits
    budgets.value = enrichBudgets(rawBudgets, hits)
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

  async function addExpense(
    budgetId: string | null,
    date: string,
    amount: string,
    note: string
  ) {
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
    budgets,
    budgetHits,
    income,
    loading,
    error,
    fetchAll,
    refreshBudgets,
    addIncome,
    removeIncome,
    addExpense,
    removeExpense,
    addBudget
  }
})
