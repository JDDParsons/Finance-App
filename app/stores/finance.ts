import { defineStore } from 'pinia'
import { useBudgetsApi } from '~/composables/api/useBudgetsApi'
import { useHitsApi } from '~/composables/api/useHitsApi'
import { useTagsApi } from '~/composables/api/useTagsApi'
import { useAccountsStore } from './accounts'
import { enrichBudgets } from '../../utils/budgetEnrichment'
import { reconcileTransferUpdate, removeTransferRow, sortTransferRows } from '../../utils/transferRows'
import type { FinanceBootstrapData } from '~/types/bootstrap'
import type { OfflineEntity, OfflineOperation } from '~/types/offline'
import { buildOptimisticEdit, buildOptimisticRow } from '../../utils/offlineRows'
import { addPendingTags, mergeTags, normalizeTagList } from '../../utils/tags'
import type { Tag } from '../../utils/tags'

export const useFinanceStore = defineStore('finance', () => {
  const accountsStore = useAccountsStore()
  const {
    getBudgetsByMonth, getAvailableBudgetMonths, getAvailableBudgets,
    createBudget, createBudgetPeriod, createBudgetPeriods, updateBudgetPeriod, updateBudgetMetadata, deleteBudget,
    getCopyPreviousPreview, copyPreviousBudgets,
  } = useBudgetsApi()
  const {
    getBudgetHitsByMonth, getIncomeByMonth,
    getTransfersByMonth, insertTransfer, updateTransfer: apiUpdateTransfer, deleteTransfer,
    getBudgetEntities, getBudgetEntitiesByBudgetIds,
    insertIncome, deleteIncome, updateIncome: apiUpdateIncome,
    createBudgetHit, deleteBudgetHit, updateBudgetHit,
    getUserProfiles,
  } = useHitsApi()
  const { getTags } = useTagsApi()

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
  // The household's tags. A tag made offline is listed as pending until it is saved.
  const tags = ref<Tag[]>([])
  const tagsByName = computed(() => new Map(tags.value.map(tag => [tag.name, tag])))

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

  /** Lists tags the app has not seen yet (made offline) so rows can show them. */
  function rememberTags(names: string[] | undefined) {
    if (names?.length) tags.value = addPendingTags(tags.value, names)
  }

  /** Takes the tag details the server sends with a saved expense, and leaves the plain row. */
  function absorbTagDetails<T extends Record<string, any>>(row: T): T {
    const { tag_details: details, ...plain } = row as Record<string, any>
    if (Array.isArray(details)) tags.value = mergeTags(tags.value, details)
    return plain as T
  }

  /** Cleans typed names the way the server does. Throws the message when a name is not allowed. */
  function cleanTagNames(names: string[]) {
    const result = normalizeTagList(names)
    if (!result.ok) throw new Error(result.message)
    return result.names
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

  function isInSelectedMonth(row: any) {
    const [year, month] = String(row?.date ?? '').slice(0, 10).split('-').map(Number)
    return year === selectedMonth.value.year && month === selectedMonth.value.month
  }

  function replaceOfflineRow(rows: any[], id: string, row: any) {
    const withoutOperation = rows.filter(existing => existing.id !== id)
    return isInSelectedMonth(row) ? [row, ...withoutOperation] : withoutOperation
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
    // Offline there is nothing to fetch; keep the cached and queued rows on screen
    // instead of replacing them with a "You are offline" error.
    if (import.meta.client && initialized.value && !navigator.onLine) return
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
      const [rawBudgets, rawIncomeBudgets, hits, prevHits, inc, transferRows, avail, , tagRows] = await Promise.all([
        getBudgetsByMonth(year, month, 'Expense'),
        getBudgetsByMonth(year, month, 'Income'),
        getBudgetHitsByMonth(year, month),
        getBudgetHitsByMonth(prevYear, prevMonth),
        getIncomeByMonth(year, month),
        getTransfersByMonth(year, month),
        getAvailableBudgetMonths(),
        accountsStore.fetchAccounts(false, silent),
        getTags(),
      ])
      tags.value = tagRows
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

  function hydrate(data: FinanceBootstrapData) {
    selectedMonth.value = data.selectedMonth
    availableMonths.value = data.availableMonths
    budgetHits.value = data.budgetHits
    prevMonthBudgetHits.value = data.prevMonthBudgetHits
    income.value = data.income
    transfers.value = data.transfers
    budgets.value = enrichSelectedMonthBudgets(data.budgets, data.budgetHits)
    incomeBudgets.value = enrichSelectedMonthBudgets(data.incomeBudgets, data.income)
    userProfiles.value = new Map(Object.entries(data.userProfiles))
    budgetAllEntities.value = new Map(Object.entries(data.budgetEntities))
    tags.value = data.tags ?? []
    initialized.value = true
    error.value = null
  }

  function snapshot(): FinanceBootstrapData {
    return {
      selectedMonth: { ...selectedMonth.value },
      availableMonths: [...availableMonths.value],
      budgets: budgets.value,
      incomeBudgets: incomeBudgets.value,
      budgetHits: budgetHits.value,
      prevMonthBudgetHits: prevMonthBudgetHits.value,
      income: income.value,
      transfers: transfers.value,
      userProfiles: Object.fromEntries(userProfiles.value),
      budgetEntities: Object.fromEntries(budgetAllEntities.value),
      tags: tags.value.filter(tag => !tag.pending),
    }
  }

  function clear() {
    availableMonths.value = []
    budgets.value = []
    incomeBudgets.value = []
    availableBudgets.value = []
    budgetHits.value = []
    prevMonthBudgetHits.value = []
    income.value = []
    transfers.value = []
    userProfiles.value = new Map()
    budgetAllEntities.value = new Map()
    tags.value = []
    initialized.value = false
    error.value = null
  }

  // The rows array an operation touches, by entity.
  function rowsFor(entity: OfflineEntity) {
    return entity === 'expense' ? budgetHits : entity === 'income' ? income : transfers
  }

  function refreshBudgetTotals(entity: OfflineEntity) {
    if (entity === 'expense') budgets.value = enrichSelectedMonthBudgets(budgets.value, budgetHits.value)
    if (entity === 'income') incomeBudgets.value = enrichSelectedMonthBudgets(incomeBudgets.value, income.value)
  }

  function sortRows(entity: OfflineEntity, rows: any[]) {
    if (entity === 'transfer') return sortTransferRows(rows)
    if (entity === 'income') return rows.sort((a, b) => String(b.date).localeCompare(String(a.date)))
    return rows
  }

  /** Show a queued change on screen again, for example after a refresh replaced the rows. */
  function restoreOfflineOperation(operation: OfflineOperation) {
    if (operation.entity === 'expense') rememberTags(operation.payload.tags as string[] | undefined)
    const rows = rowsFor(operation.entity)
    if (operation.action === 'delete') {
      rows.value = rows.value.filter(row => row.id !== operation.targetId)
      refreshBudgetTotals(operation.entity)
      return
    }

    const failed = operation.status === 'failed' ? operation.error : null
    const existing = rows.value.find(row => row.id === operation.targetId)
    if (operation.action === 'edit') {
      if (!existing) return
      const edited = {
        ...buildOptimisticEdit(operation.entity, existing, operation.userId, operation.targetId, operation.payload),
        pending_sync: !failed,
        sync_error: failed,
      }
      rows.value = sortRows(operation.entity, rows.value.map(row => row.id === operation.targetId ? edited : row))
      refreshBudgetTotals(operation.entity)
      return
    }

    const row = buildOptimisticRow(operation.entity, operation.id, operation.userId, operation.payload, failed)
    if (!isInSelectedMonth(row) || existing) return
    rows.value = sortRows(operation.entity, [row, ...rows.value])
    refreshBudgetTotals(operation.entity)
  }

  /** A queued create or edit was saved: swap the optimistic row for the server's row. */
  function reconcileOfflineOperation(operation: OfflineOperation, row: any) {
    const rows = rowsFor(operation.entity)
    rows.value = sortRows(operation.entity, replaceOfflineRow(rows.value, operation.targetId, absorbTagDetails(row)))
    refreshBudgetTotals(operation.entity)
  }

  function markOfflineOperationFailed(operation: OfflineOperation, message: string) {
    const rows = rowsFor(operation.entity)
    rows.value = rows.value.map(row => row.id === operation.targetId
      ? { ...row, pending_sync: false, sync_error: message }
      : row)
  }

  /** Remove rows that only exist as unsynced creates (their operation ids). */
  function removeOfflineCreates(operationIds: string[]) {
    const ids = new Set(operationIds)
    budgetHits.value = budgetHits.value.filter(row => !ids.has(row.id))
    income.value = income.value.filter(row => !ids.has(row.id))
    transfers.value = transfers.value.filter(row => !ids.has(row.id))
    budgets.value = enrichSelectedMonthBudgets(budgets.value, budgetHits.value)
    incomeBudgets.value = enrichSelectedMonthBudgets(incomeBudgets.value, income.value)
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
    const row = await apiUpdateIncome(id, amount, date, entity, resolvedBudgetId, resolvedAccountId, resolvedNotes, existing)
    income.value = income.value.map(r => r.id === id ? row : r).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )
    incomeBudgets.value = enrichSelectedMonthBudgets(incomeBudgets.value, income.value)
  }

  // ── expenses ──────────────────────────────────────────────────────────────

  async function addExpense(budgetId: string | null, date: string, amount: string, entity: string, accountId: string | null = null, notes: string | null = null, tagNames?: string[]) {
    const names = tagNames ? cleanTagNames(tagNames) : undefined
    rememberTags(names)
    const hit = absorbTagDetails(await createBudgetHit(budgetId, date, amount, entity, accountId, notes, names))
    budgetHits.value = [hit, ...budgetHits.value]
    budgets.value = enrichSelectedMonthBudgets(budgets.value, budgetHits.value)
  }

  async function removeExpense(id: string) {
    await deleteBudgetHit(id)
    budgetHits.value = budgetHits.value.filter(h => h.id !== id)
    budgets.value = enrichSelectedMonthBudgets(budgets.value, budgetHits.value)
  }

  async function updateExpense(id: string, budgetId: string | null, date: string, amount: string, entity: string, accountId?: string | null, notes?: string | null, tagNames?: string[]) {
    const existing = budgetHits.value.find((h: any) => h.id === id)
    const resolvedAccountId = accountId === undefined ? (existing?.account_id ?? null) : accountId
    const resolvedNotes = notes === undefined ? (existing?.notes ?? null) : notes
    const names = tagNames ? cleanTagNames(tagNames) : undefined
    rememberTags(names)
    const hit = absorbTagDetails(await updateBudgetHit(id, budgetId, date, amount, entity, resolvedAccountId, resolvedNotes, names, existing))
    budgetHits.value = budgetHits.value.map(h => h.id === id ? hit : h)
    budgets.value = enrichSelectedMonthBudgets(budgets.value, budgetHits.value)
  }

  // ── transfers ─────────────────────────────────────────────────────────────

  async function addTransfer(fromAccountId: string, toAccountId: string, amount: number, date: string) {
    const row = await insertTransfer(fromAccountId, toAccountId, amount, date)
    transfers.value = sortTransferRows([row, ...transfers.value])
    return row
  }

  async function updateTransfer(id: string, fromAccountId: string, toAccountId: string, amount: number, date: string) {
    const existing = transfers.value.find((r: any) => r.id === id)
    const row = await apiUpdateTransfer(id, fromAccountId, toAccountId, amount, date, existing)
    transfers.value = reconcileTransferUpdate(transfers.value, row, selectedMonth.value)
    return row
  }

  async function removeTransfer(id: string) {
    await deleteTransfer(id)
    transfers.value = removeTransferRow(transfers.value, id)
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
    tags,
    tagsByName,
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
    hydrate,
    snapshot,
    clear,
    restoreOfflineOperation,
    reconcileOfflineOperation,
    markOfflineOperationFailed,
    removeOfflineCreates,
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
    updateTransfer,
    removeTransfer,
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
