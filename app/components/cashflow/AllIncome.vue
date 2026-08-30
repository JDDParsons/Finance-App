<script setup lang="ts">
import { useFinanceStore } from '~/stores/finance'

const store = useFinanceStore()
const incomeRows = computed(() => store.income)

const accountMap = computed(() =>
  new Map<string, string>(store.accounts.map((a: any) => [a.id, a.name || a.institution || 'Account']))
)
const budgetMap = computed(() => new Map(store.incomeBudgets.map((budget: any) => [budget.id, budget.name])))

async function handleDelete(id: string) {
  if (!confirm('Delete this income record?')) return
  try {
    await store.removeIncome(id)
  } catch (err: any) {
    alert('Error deleting income: ' + (err?.message || 'Unknown error'))
  }
}

const selectedIncome = ref<any>(null)
const isEditingIncome = ref(false)

function handleEdit(id: string) {
  selectedIncome.value = incomeRows.value.find((r: any) => r.id === id) ?? null
  if (selectedIncome.value) isEditingIncome.value = true
}

function handleEditClose() {
  isEditingIncome.value = false
  selectedIncome.value = null
}

async function handleModalDelete() {
  if (!selectedIncome.value) return
  if (!confirm('Are you sure you want to delete this income record? This action cannot be undone.')) return
  try {
    await store.removeIncome(selectedIncome.value.id)
    handleEditClose()
  } catch (err: any) {
    alert(err?.message || 'Failed to delete income')
  }
}
</script>

<template>
  <div class="flex flex-col gap-4 pt-4">
    <!-- Income calendar -->
    <CashflowIncomeCalendar />

    <div v-if="store.loading" class="flex justify-center py-12">
      <UIcon name="heroicons-solid:arrow-path" class="w-8 h-8 animate-spin text-primary-500" />
    </div>

    <UAlert v-else-if="store.error" color="error" :description="store.error" />

    <div v-else-if="incomeRows.length === 0" class="text-center text-gray-400 py-16">
      No income records yet. Tap <strong>+</strong> to add one.
    </div>

    <div v-else class="flex flex-col gap-3">
      <CashflowIncomeCard
        v-for="row in incomeRows"
        :key="row.id"
        :id="row.id"
        :amount="row.amount"
        :date="row.date"
        :entity="row.entity"
        :account-name="row.account_id ? accountMap.get(row.account_id) ?? null : null"
        :budget-name="row.budget_id ? budgetMap.get(row.budget_id) ?? null : null"
        @delete="handleDelete"
        @edit="handleEdit"
      />
    </div>
  </div>

  <UModal v-if="selectedIncome" v-model:open="isEditingIncome" @update:open="(val) => { if (!val) handleEditClose() }">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h2 class="text-2xl font-bold">Edit Income</h2>
            <UButton
              icon="heroicons-solid:trash"
              color="error"
              variant="ghost"
              size="sm"
              @click="handleModalDelete"
            />
          </div>
        </template>
        <IncomeEdit
          :income-id="selectedIncome.id"
          :income-amount="selectedIncome.amount"
          :income-date="selectedIncome.date"
          :income-entity="selectedIncome.entity"
          :income-budget-id="selectedIncome.budget_id ?? null"
          :income-account-id="selectedIncome.account_id ?? null"
          @update="handleEditClose"
          @cancel="handleEditClose"
          @delete="handleEditClose"
        />
      </UCard>
    </template>
  </UModal>
</template>
