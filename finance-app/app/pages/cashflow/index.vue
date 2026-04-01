<script setup lang="ts">
import { ref, computed } from 'vue'
import { useFinanceStore } from '~/stores/finance'

const store = useFinanceStore()

// Tab state — 'income' | 'expenses'
const activeTab = ref('income')

const isSlideoverOpen = ref(false)
const slideoverLoading = ref(false)

// Income form
const incomeAmount = ref('')
const incomeDate = ref(new Date().toISOString().split('T')[0])
const incomeNote = ref('')
const incomeAccountId = ref<string | null>(null)

// Expense form
const expenseAmount = ref('')
const expenseDate = ref(new Date().toLocaleDateString('en-CA'))
const expenseNote = ref('')
const selectedBudgetId = ref('')
const noBudget = ref(false)
const expenseAccountId = ref<string | null>(null)

const accountItems = computed(() =>
  store.accounts.map((a: any) => ({ label: a.name || a.institution || 'Account', value: a.id }))
)

const tabLabel = computed(() => activeTab.value === 'income' ? 'Income' : 'Expense')

function openSlideover() {
  resetForms()
  isSlideoverOpen.value = true
}

function closeSlideover() {
  isSlideoverOpen.value = false
  resetForms()
}

function resetForms() {
  incomeAmount.value = ''
  incomeDate.value = new Date().toISOString().split('T')[0]
  incomeNote.value = ''
  incomeAccountId.value = store.defaultIncomeAccount?.id ?? null
  expenseAmount.value = ''
  expenseDate.value = new Date().toLocaleDateString('en-CA')
  expenseNote.value = ''
  selectedBudgetId.value = ''
  noBudget.value = false
  expenseAccountId.value = store.defaultExpenseAccount?.id ?? null
}

async function handleSave() {
  if (activeTab.value === 'income') {
    await saveIncome()
  } else {
    await saveExpense()
  }
}

async function saveIncome() {
  if (!incomeAmount.value || !incomeDate.value) {
    alert('Amount and date are required.')
    return
  }
  try {
    slideoverLoading.value = true
    await store.addIncome(parseFloat(incomeAmount.value), incomeDate.value, incomeNote.value, incomeAccountId.value)
    closeSlideover()
  } catch (err: any) {
    alert('Error saving income: ' + (err?.message || 'Unknown error'))
  } finally {
    slideoverLoading.value = false
  }
}

async function saveExpense() {
  if (!expenseDate.value) { alert('Please select a date'); return }
  if (!expenseAmount.value) { alert('Please enter an amount'); return }
  if (!noBudget.value && !selectedBudgetId.value) { alert('Please select a budget'); return }
  try {
    slideoverLoading.value = true
    const budgetIdToSubmit = noBudget.value ? null : selectedBudgetId.value
    await store.addExpense(budgetIdToSubmit, expenseDate.value, expenseAmount.value, expenseNote.value, expenseAccountId.value)
    closeSlideover()
  } catch (err: any) {
    alert('Error creating expense: ' + (err?.message || 'Unknown error'))
  } finally {
    slideoverLoading.value = false
  }
}
</script>

<template>
  <UContainer>
    <!-- Month Selector -->
    <MonthSelector />
    
    <!-- Header -->
    <div class="flex items-center justify-center pt-2 mb-2">
        <h2 class="text-3xl font-bold">Cashflow</h2>
    </div>


    <!-- Tabs -->
    <div class="px-4 pb-24">
      <UTabs
        v-model="activeTab"
        color="primary"
        :items="[
          { label: 'Income', slot: 'income', icon: 'heroicons-solid:arrow-trending-up', value: 'income' },
          { label: 'Expenses', slot: 'expenses', icon: 'heroicons-solid:arrow-trending-down', value: 'expenses' }
        ]"
      >
        <template #income>
          <CashflowAllIncome />
        </template>
        <template #expenses>
          <CashflowAllExpenses />
        </template>
      </UTabs>
    </div>

    <!-- Slideover -->
    <USlideover
      v-model:open="isSlideoverOpen"
      class="w-full sm:max-w-md"
    >
      <template #content>
        <div class="flex flex-col h-full">
          <div class="flex-1 p-6 overflow-y-auto">
            <h3 class="text-2xl font-bold mb-6">Add {{ tabLabel }}</h3>

            <!-- Income form -->
            <div v-if="activeTab === 'income'" class="space-y-6">
              <UFormField label="Amount" required>
                <UInput
                  v-model="incomeAmount"
                  placeholder="0.00"
                  type="number"
                  step="0.01"
                  min="0"
                  size="xl"
                />
              </UFormField>

              <UFormField label="Date" required>
                <UInput
                  v-model="incomeDate"
                  type="date"
                  size="xl"
                />
              </UFormField>

              <UFormField label="Note">
                <UInput
                  v-model="incomeNote"
                  placeholder="Leave a note..."
                  type="text"
                  size="xl"
                />
              </UFormField>

              <UFormField label="Account">
                <USelect
                  v-model="incomeAccountId"
                  :items="accountItems"
                  placeholder="Select an account..."
                  size="xl"
                />
              </UFormField>
            </div>

            <!-- Expense form -->
            <div v-else class="space-y-6">
              <UFormField label="Amount" required>
                <UInput
                  v-model="expenseAmount"
                  placeholder="0.00"
                  type="number"
                  step="0.01"
                  size="xl"
                />
              </UFormField>

              <UFormField label="Date" required>
                <UInput
                  v-model="expenseDate"
                  type="date"
                  size="xl"
                />
              </UFormField>

              <UFormField label="Note">
                <UInput
                  v-model="expenseNote"
                  placeholder="Leave a note..."
                  type="text"
                  size="xl"
                />
              </UFormField>

              <UFormField label="Budget" :required="!noBudget">
                <USelect
                  v-model="selectedBudgetId"
                  :items="store.budgets.map((b: any) => ({ label: b.name, value: b.id }))"
                  placeholder="Select a budget..."
                  size="xl"
                  :disabled="noBudget"
                />
              </UFormField>

              <UCheckbox v-model="noBudget" label="No budget" />

              <UFormField label="Account">
                <USelect
                  v-model="expenseAccountId"
                  :items="accountItems"
                  placeholder="Select an account..."
                  size="xl"
                />
              </UFormField>
            </div>
          </div>

          <div class="p-6 border-t">
            <div class="flex gap-3">
              <UButton
                color="primary"
                class="flex-1"
                size="lg"
                :loading="slideoverLoading"
                :disabled="slideoverLoading"
                @click="handleSave"
              >
                Save {{ tabLabel }}
              </UButton>
              <UButton
                color="neutral"
                variant="outline"
                class="flex-1"
                size="lg"
                :disabled="slideoverLoading"
                @click="closeSlideover"
              >
                Close
              </UButton>
            </div>
          </div>
        </div>
      </template>
    </USlideover>
    <GreenAddButton @click="openSlideover" />
  </UContainer>
</template>
