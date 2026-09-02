import { defineStore } from 'pinia'
import { useBudgetsApi } from '~/composables/api/useBudgetsApi'
import { useHitsApi } from '~/composables/api/useHitsApi'
import { useAccountsStore } from './accounts'
import { enrichBudgets } from '../../utils/budgetEnrichment'

export const useFinanceStore = defineStore('finance', () => {
  const accountsStore = useAccountsStore()
  const {
    getBudgetsByMonth, getAvailableBudgetMonths, getAvailableBudgets,
    createBudget, createBudgetPeriod, createBudgetPeriods, updateBudgetPeriod, updateBudgetMetadata, deleteBudget,
    getCopyPreviousPreview, copyPreviousBudgets,
  } = useBudgetsApi()
  const {
    getBudgetHitsByMonth, getIncomeByMonth,
    getTransfersByMonth, insertTransfer,
    getBudgetEntities, getBudgetEntitiesByBudgetIds,
    insertIncome, deleteIncome, updateIncome: apiUpdateIncome,
    createBudgetHit, deleteBudgetHit, updateBudgetHit,
    getUserProfiles,
  } = useHitsApi()

  const _now = new Date()
  const selectedMonth = ref({ year: _now.getFullYear(), month: _now.getMonth() + 1 })

  const availableMonths = ref<{ year: number; month: number }[]>([])
  const budgets = ref<any[]>([])
  const incomeBudgets = ref<any[]>([])
  const availableBudgets = ref<any[]>([])
  const budgetHits = ref<any[]>([])
  const prevMonthBudgetHits = ref<any[]>([])
  const income = ref<any[]>([])
  const transfers = ref<any[]>([])
  const accounts = computed(() => accountsStore.accounts)
  const loading = ref(false)
  const refreshing = ref(false)
  const error = ref<string | null>(null)
  const initialized = ref(false)
  const userProfiles = ref<Map<string, { firstName: string | null; avatarLink: string | null }>>(new Map())
  const budgetAllEntities = ref<Map<string, string[]>>(new Map())

  const defaultExpenseAccount = computed(() =>
    accounts.value.find((a: any) => a.is_default_for_expenses) ?? null
  )
  const defaultIncomeAccount = computed(() =>
    accounts.value.find((a: any) => a.is_default_for_income) ?? null
  )

  // ── helpers ──────────────────────────────────────────────────────────────

  function enrichSelectedMonthBudgets(rawBudgets: any[], hits: any[]) {
    const { year, month } = selectedMonth.value
    return enrichBudgets(rawBudgets, hits, year, month)
  }

  function normalizeEntities(entities: string[]) {
    const seen = new Set<string>()
    const normalized: string[] = []

    for (const value of entities) {
      const entity = value.trim()
      if (!entity || seen.has(entity)) continue
      seen.add(entity)
      normalized.push(entity)
    }

    return normalized
  }

  function createBudgetEntityMap(budgetIds: string[], entitiesByBudget: Record<string, string[]>) {
    return new Map(
      budgetIds.map(budgetId => [budgetId, normalizeEntities(entitiesByBudget[budgetId] ?? [])])
    )
  }

  function reconcileBudgetEntityMap(rawBudgets: any[]) {
    return new Map(
      rawBudgets
        .map((budget: any) => budget?.id)
        .filter(Boolean)
        .map((budgetId: string) => [budgetId, budgetAllEntities.value.get(budgetId) ?? []])
    )
  }

  // ── fetch ─────────────────────────────────────────────────────────────────

  /** @param silent When true, skips setting loading/refreshing flags on this store and any dependent store fetches. */
  async function fetchAll(silent = false) {
    try {
      if (!silent) {
        if (initialized.value) {
          refreshing.value = true
        } else {
          loading.value = true
        }
      }
      error.value = null
      const { year, month } = selectedMonth.value
      const prevYear = month === 1 ? year - 1 : year
      const prevMonth = month === 1 ? 12 : month - 1
      const [rawBudgets, rawIncomeBudgets, hits, prevHits, inc, transferRows, avail] = await Promise.all([
        getBudgetsByMonth(year, month, 'Expense'),
        getBudgetsByMonth(year, month, 'Income'),
        getBudgetHitsByMonth(year, month),
        getBudgetHitsByMonth(prevYear, prevMonth),
        getIncomeByMonth(year, month),
        getTransfersByMonth(year, month),
        getAvailableBudgetMonths(),
        accountsStore.fetchAccounts(false, silent),
      ])
      availableMonths.value = avail
      budgetHits.value = hits
      prevMonthBudgetHits.value = prevHits
      income.value = inc
      transfers.value = transferRows
      budgets.value = enrichSelectedMonthBudgets(rawBudgets, hits)
      incomeBudgets.value = enrichSelectedMonthBudgets(rawIncomeBudgets, inc)
      const budgetIds = [...rawBudgets, ...rawIncomeBudgets]
        .map((budget: any) => budget?.id)
        .filter(Boolean)
      initialized.value = true
      const uniqueUserIds = [...new Set((hits as any[]).map((h: any) => h.user_id).filter(Boolean))] as string[]
      const [profiles, entitiesByBudget] = await Promise.all([
        getUserProfiles(uniqueUserIds),
        budgetIds.length
          ? getBudgetEntitiesByBudgetIds(budgetIds)
          : Promise.resolve({} as Record<string, string[]>),
      ])
      const profileMap = new Map<string, { firstName: string | null; avatarLink: string | null }>()
      for (const p of profiles) profileMap.set(p.id, { firstName: p.first_name, avatarLink: p.avatar_link })
      userProfiles.value = profileMap
      budgetAllEntities.value = createBudgetEntityMap(budgetIds, entitiesByBudget)
    } catch (err: any) {
      error.value = err?.message || 'Failed to load data'
    } finally {
      if (!silent) {
        loading.value = false
        refreshing.value = false
      }
    }
  }

  async function ensureLoaded() {
    if (!initialized.value) await fetchAll()
  }

  async function refreshBudgets() {
    const { year, month } = selectedMonth.value
    const [rawBudgets, rawIncomeBudgets, hits, inc] = await Promise.all([
      getBudgetsByMonth(year, month, 'Expense'),
      getBudgetsByMonth(year, month, 'Income'),
      getBudgetHitsByMonth(year, month),
      getIncomeByMonth(year, month),
    ])
    budgetHits.value = hits
    income.value = inc
    budgets.value = enrichSelectedMonthBudgets(rawBudgets, hits)
    incomeBudgets.value = enrichSelectedMonthBudgets(rawIncomeBudgets, inc)
    budgetAllEntities.value = reconcileBudgetEntityMap([...rawBudgets, ...rawIncomeBudgets])
  }

  async function fetchAvailableBudgets(type: 'Expense' | 'Income' = 'Expense') {
    const { year, month } = selectedMonth.value
    availableBudgets.value = await getAvailableBudgets(year, month, type)
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
    const nowKey = monthKey(_now.getFullYear(), _now.getMonth() + 1)
    return cur < nowKey || availableMonths.value.some(m => monthKey(m.year, m.month) > cur)
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
    if (next) {
      setMonth(next.year, next.month)
    } else {
      // No next month in availableMonths — advance one calendar month (capped at today)
      const nowKey = monthKey(_now.getFullYear(), _now.getMonth() + 1)
      if (cur < nowKey) {
        const nextCalMonth = month === 12 ? 1 : month + 1
        const nextCalYear = month === 12 ? year + 1 : year
        setMonth(nextCalYear, nextCalMonth)
      }
    }
  }

  // ── entity suggestions ────────────────────────────────────────────────────

  async function fetchBudgetEntities(budgetId: string) {
    const entitiesByBudget = await getBudgetEntities(budgetId)
    budgetAllEntities.value = new Map(budgetAllEntities.value).set(
      budgetId,
      normalizeEntities(entitiesByBudget[budgetId] ?? [])
    )
  }

  // ── income ────────────────────────────────────────────────────────────────

  async function addIncome(amount: number, date: string, entity: string, budgetId: string | null = null, accountId: string | null = null, notes: string | null = null) {
    const row = await insertIncome(amount, date, entity, budgetId, accountId, notes)
    income.value = [row, ...income.value].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )
    incomeBudgets.value = enrichSelectedMonthBudgets(incomeBudgets.value, income.value)
  }

  async function removeIncome(id: string) {
    await deleteIncome(id)
    income.value = income.value.filter(r => r.id !== id)
    incomeBudgets.value = enrichSelectedMonthBudgets(incomeBudgets.value, income.value)
  }

  async function updateIncome(id: string, amount: number, date: string, entity: string, budgetId?: string | null, accountId?: string | null, notes?: string | null) {
    const existing = income.value.find((r: any) => r.id === id)
    const resolvedAccountId = accountId === undefined ? (existing?.account_id ?? null) : accountId
    const resolvedBudgetId = budgetId === undefined ? (existing?.budget_id ?? null) : budgetId
    const resolvedNotes = notes === undefined ? (existing?.notes ?? null) : notes
    const row = await apiUpdateIncome(id, amount, date, entity, resolvedBudgetId, resolvedAccountId, resolvedNotes)
    income.value = income.value.map(r => r.id === id ? row : r).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )
    incomeBudgets.value = enrichSelectedMonthBudgets(incomeBudgets.value, income.value)
  }

  // ── expenses ──────────────────────────────────────────────────────────────

  async function addExpense(budgetId: string | null, date: string, amount: string, entity: string, accountId: string | null = null, notes: string | null = null) {
    const hit = await createBudgetHit(budgetId, date, amount, entity, accountId, notes)
    budgetHits.value = [hit, ...budgetHits.value]
    budgets.value = enrichSelectedMonthBudgets(budgets.value, budgetHits.value)
  }

  async function removeExpense(id: string) {
    await deleteBudgetHit(id)
    budgetHits.value = budgetHits.value.filter(h => h.id !== id)
    budgets.value = enrichSelectedMonthBudgets(budgets.value, budgetHits.value)
  }

  async function updateExpense(id: string, budgetId: string | null, date: string, amount: string, entity: string, accountId?: string | null, notes?: string | null) {
    const existing = budgetHits.value.find((h: any) => h.id === id)
    const resolvedAccountId = accountId === undefined ? (existing?.account_id ?? null) : accountId
    const resolvedNotes = notes === undefined ? (existing?.notes ?? null) : notes
    const hit = await updateBudgetHit(id, budgetId, date, amount, entity, resolvedAccountId, resolvedNotes)
    budgetHits.value = budgetHits.value.map(h => h.id === id ? hit : h)
    budgets.value = enrichSelectedMonthBudgets(budgets.value, budgetHits.value)
  }

  // ── transfers ─────────────────────────────────────────────────────────────

  async function addTransfer(fromAccountId: string, toAccountId: string, amount: number, date: string) {
    const row = await insertTransfer(fromAccountId, toAccountId, amount, date)
    transfers.value = [row, ...transfers.value].sort((a, b) => {
      const dateOrder = String(b.date ?? '').localeCompare(String(a.date ?? ''))
      return dateOrder || String(b.created_at ?? '').localeCompare(String(a.created_at ?? ''))
    })
    return row
  }

  // ── budgets ───────────────────────────────────────────────────────────────

  async function addBudget(name: string, amount: string, color?: string, icon?: string | null, type: 'Expense' | 'Income' = 'Expense') {
    const { year, month } = selectedMonth.value
    await createBudget(name, amount, color, icon, type, year, month)
    await refreshBudgets()
  }

  async function addExistingBudget(id: string, amount: string) {
    const { year, month } = selectedMonth.value
    await createBudgetPeriod(id, amount, year, month)
    await refreshBudgets()
  }

  async function addExistingBudgets(budgetsToAdd: Array<{ id: string; amount: string }>) {
    const { year, month } = selectedMonth.value
    const result = await createBudgetPeriods(budgetsToAdd, year, month)
    await refreshBudgets()
    return result
  }

  async function editBudgetPeriod(id: string, amount: string) {
    const { year, month } = selectedMonth.value
    await updateBudgetPeriod(id, amount, year, month)
    await refreshBudgets()
  }

  async function editBudgetMetadata(
    id: string,
    name: string,
    color?: string,
    icon?: string | null
  ) {
    await updateBudgetMetadata(id, name, color, icon)
    await refreshBudgets()
  }

  async function removeBudget(id: string) {
    const { year, month } = selectedMonth.value
    await deleteBudget(id, year, month)
    budgets.value = budgets.value.filter((b: any) => b.id !== id)
    incomeBudgets.value = incomeBudgets.value.filter((b: any) => b.id !== id)
  }

  async function getCopyPreview(type: 'Expense' | 'Income' = 'Expense') {
    const { year, month } = selectedMonth.value
    return getCopyPreviousPreview(year, month, type)
  }

  async function copyPreviousMonthBudgets(type: 'Expense' | 'Income' = 'Expense') {
    const { year, month } = selectedMonth.value
    const result = await copyPreviousBudgets(year, month, type)
    await refreshBudgets()
    availableMonths.value = await getAvailableBudgetMonths()
    return result
  }

  return {
    selectedMonth,
    availableMonths,
    hasPrev,
    hasNext,
    budgets,
    incomeBudgets,
    availableBudgets,
    budgetHits,
    prevMonthBudgetHits,
    budgetAllEntities,
    income,
    transfers,
    accounts,
    userProfiles,
    defaultExpenseAccount,
    defaultIncomeAccount,
    loading,
    refreshing,
    error,
    initialized,
    fetchAll,
    ensureLoaded,
    refreshBudgets,
    fetchAvailableBudgets,
    fetchBudgetEntities,
    setMonth,
    prevMonth,
    nextMonth,
    addIncome,
    removeIncome,
    updateIncome,
    addExpense,
    removeExpense,
    updateExpense,
    addTransfer,
    addBudget,
    addExistingBudget,
    addExistingBudgets,
    editBudgetPeriod,
    editBudgetMetadata,
    removeBudget,
    getCopyPreview,
    copyPreviousMonthBudgets,
  }
})
