<script setup lang="ts">
import { useFinanceStore } from '~/stores/finance'
import { useBudgetIcon } from '~/composables/useBudgetIcon'
import { accountDisplayName } from '../../../utils/accountAppearance'

const store = useFinanceStore()
const { budgetIcon } = useBudgetIcon()

const budgetMap = computed(() =>
  new Map<string, string>(store.budgets.map((b: any) => [b.id, b.name]))
)

const budgetColorMap = computed(() =>
  new Map<string, string | null>(store.budgets.map((b: any) => [b.id, b.color ?? null]))
)

const budgetIconMap = computed(() =>
  new Map<string, string>(store.budgets.map((b: any) => [b.id, b.icon ?? budgetIcon(b.name)]))
)

const accountMap = computed(() =>
  new Map<string, string>(store.accounts.map((a: any) => [a.id, accountDisplayName(a)]))
)

const accountInstitutionMap = computed(() =>
  new Map<string, string | null>(store.accounts.map((a: any) => [a.id, a.institution ?? null]))
)

const expenses = computed(() => store.budgetHits)

function toDateKey(value: string | null | undefined) {
  if (!value) return ''
  return value.slice(0, 10)
}

function dateFromKey(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function localDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDateSubheader(dateKey: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }).format(dateFromKey(dateKey))
}

const dailyExpenseSections = computed(() => {
  const groups = new Map<string, any[]>()

  for (const expense of expenses.value) {
    const dateKey = toDateKey(expense.date)
    if (!dateKey) continue

    const items = groups.get(dateKey) ?? []
    items.push(expense)
    groups.set(dateKey, items)
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayKey = localDateKey(today)

  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  const yesterdayKey = localDateKey(yesterday)

  return Array.from(groups.entries())
    .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
    .map(([dateKey, items]) => {
      let title = dateFromKey(dateKey).toLocaleDateString('en-US', { weekday: 'long' })
      if (dateKey === todayKey) title = 'Today'
      if (dateKey === yesterdayKey) title = 'Yesterday'

      return {
        key: dateKey,
        title,
        dateLabel: formatDateSubheader(dateKey),
        items
      }
    })
})

const now = new Date()
const isCurrentMonth = computed(() =>
  store.selectedMonth.year === now.getFullYear() &&
  store.selectedMonth.month === now.getMonth() + 1
)

const selectedExpense = ref<any>(null)
const isEditingExpense = ref(false)

function handleEdit(id: string) {
  selectedExpense.value = expenses.value.find((h: any) => h.id === id) ?? null
  if (selectedExpense.value) isEditingExpense.value = true
}

function handleEditClose() {
  isEditingExpense.value = false
  selectedExpense.value = null
}

async function handleDelete(id: string) {
  if (!confirm('Are you sure you want to delete this expense?')) return
  try {
    await store.removeExpense(id)
  } catch (err: any) {
    alert(err?.message || 'Failed to delete expense')
  }
}

async function handleModalDelete() {
  if (!selectedExpense.value) return
  if (!confirm('Are you sure you want to delete this expense? This action cannot be undone.')) return
  try {
    await store.removeExpense(selectedExpense.value.id)
    handleEditClose()
  } catch (err: any) {
    alert(err?.message || 'Failed to delete expense')
  }
}
</script>

<template>
  <div class="flex flex-col gap-4 pt-4">
    <div v-if="store.loading" class="flex justify-center py-12">
      <UIcon name="heroicons-solid:arrow-path" class="w-8 h-8 animate-spin text-primary-500" />
    </div>

    <UAlert v-else-if="store.error" color="error" :description="store.error" />

    <div v-else-if="expenses.length === 0" class="text-center text-gray-400 py-16">
      No expenses recorded for this month. Tap <strong>+</strong> to add one.
    </div>

    <div v-else class="flex flex-col gap-3">
      <CashflowSevenDayExpenses v-if="isCurrentMonth" :expenses="expenses" />
      <div class="flex flex-col gap-4">
        <section v-for="section in dailyExpenseSections" :key="section.key" class="flex flex-col gap-2">
          <div>
            <h3 class="text-base font-semibold text-gray-900 dark:text-gray-100">{{ section.title }}</h3>
            <p class="text-xs text-gray-500">{{ section.dateLabel }}</p>
          </div>
          <ExpenseCard
            v-for="hit in section.items"
            :key="hit.id"
            :id="hit.id"
            :amount="hit.amount"
            :date="hit.date"
            :entity="hit.entity"
            :notes="hit.notes"
            :budget-name="budgetMap.get(hit.budget_id)"
            :budget-color="hit.budget_id ? budgetColorMap.get(hit.budget_id) ?? null : null"
            :budget-icon="hit.budget_id ? budgetIconMap.get(hit.budget_id) ?? null : null"
            :account-name="hit.account_id ? accountMap.get(hit.account_id) ?? null : null"
            :account-institution="hit.account_id ? accountInstitutionMap.get(hit.account_id) ?? null : null"
            :user-first-name="hit.user_id ? store.userProfiles.get(hit.user_id)?.firstName ?? null : null"
            :user-avatar-link="hit.user_id ? store.userProfiles.get(hit.user_id)?.avatarLink ?? null : null"
            @delete="handleDelete"
            @edit="handleEdit"
          />
        </section>
      </div>
    </div>
  </div>

  <UModal v-if="selectedExpense" v-model:open="isEditingExpense" @update:open="(val) => { if (!val) handleEditClose() }">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h2 class="text-2xl font-bold">Edit Expense</h2>
            <UButton
              icon="heroicons-solid:trash"
              color="error"
              variant="ghost"
              size="sm"
              @click="handleModalDelete"
            />
          </div>
        </template>
        <ExpenseEdit
          :expense-id="selectedExpense.id"
          :expense-amount="selectedExpense.amount"
          :expense-date="selectedExpense.date"
          :expense-entity="selectedExpense.entity"
          :expense-notes="selectedExpense.notes"
          :expense-budget-id="selectedExpense.budget_id"
          :expense-account-id="selectedExpense.account_id ?? null"
          @update="handleEditClose"
          @cancel="handleEditClose"
          @delete="handleEditClose"
        />
      </UCard>
    </template>
  </UModal>
</template>
