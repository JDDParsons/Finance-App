<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSelectedMonthTitle } from '~/composables/useSelectedMonthTitle'
import { useFinanceStore } from '~/stores/finance'

useHead({ title: 'Budgets | R&J Finance' })

const store = useFinanceStore()
const router = useRouter()
const { monthTitle } = useSelectedMonthTitle()
const searchText = ref('')

onMounted(() => { store.ensureLoaded() })
const displayBudgets = ref<any[]>([])
const loading = computed(() => store.loading)
const error = computed(() => store.error)

// Keep displayBudgets in sync with store; re-apply search filter and default sort (amount descending)
watchEffect(() => {
    const q = searchText.value.toLowerCase().trim()
    const filtered = q
        ? store.budgets.filter((b: any) => b.name.toLowerCase().includes(q))
        : [...store.budgets]
    displayBudgets.value = filtered.sort((a: any, b: any) => (b.currentPeriod?.amount || 0) - (a.currentPeriod?.amount || 0))
})


const headerMenuItems = computed(() => [[
    { label: 'Add Budget', icon: 'heroicons-solid:plus', onSelect: () => { isSlideoverOpen.value = true } },
]])
const isSlideoverOpen = ref(false)
const budgetName = ref('')
const amount = ref('')
const budgetColor = ref('#6366f1')
const budgetIconChoice = ref<string | null>(null)
const createLoading = ref(false)


function validateBudgetForm() {
    if (!budgetName.value.trim()) {
        alert('Please enter a budget name')
        return false
    }
    if (!amount.value) {
        alert('Please enter an amount')
        return false
    }
    return true
}

async function handleCreateBudget() {
    if (validateBudgetForm()) {
        try {
            createLoading.value = true
            await store.addBudget(budgetName.value, amount.value, budgetColor.value, budgetIconChoice.value)
            budgetName.value = ''
            amount.value = ''
            isSlideoverOpen.value = false
        } catch (error: any) {
            alert('Error creating budget: ' + (error?.message || 'Unknown error'))
        } finally {
            createLoading.value = false
        }
    }
}

function closeSlideover() {
    isSlideoverOpen.value = false
    budgetName.value = ''
    amount.value = ''
    budgetColor.value = '#6366f1'
    budgetIconChoice.value = null
}

function goToBudget(budgetId: string) {
    router.push(`/budgets/${budgetId}`)
}




</script>

<template>
  <div class="min-h-screen">
    <AppHeader title="Budgets" />

    <UContainer>
        <!-- Budget Allocation Chart -->
        <div class="flex items-end gap-1 mt-4 mb-2">
          <BudgetsAllocationGaugeBar class="flex-1" />
          <UDropdownMenu :items="headerMenuItems" :content="{ align: 'end' }">
            <UButton
              color="neutral"
              variant="ghost"
              icon="heroicons-solid:ellipsis-vertical"
              size="md"
              aria-label="More options"
              class="!py-0"
            />
          </UDropdownMenu>
        </div>



        <div v-if="error" class="mb-4">
            <UAlert
                title="Error"
                :description="error"
                color="error"
                variant="soft"
            />
        </div>

        <div v-if="loading" class="text-center py-12">
            <p class="text-gray-400">Loading budgets...</p>
        </div>

        <div v-else-if="displayBudgets.length === 0" class="text-center py-12">
            <p class="text-gray-400">No budgets yet. Use the menu to create one.</p>
        </div>

        <div v-else class="grid grid-cols-3 gap-3 pb-24 lg:pb-6 sm:grid-cols-3 lg:grid-cols-4">
            <BudgetsBudgetCard
                v-for="budget in displayBudgets"
                :key="budget.id"
                :budget="budget"
                @select="goToBudget"
            />
        </div>

        <USlideover 
            v-model:open="isSlideoverOpen"
            class="w-full sm:max-w-md"
            >
            <template #content>
                <div class="flex flex-col h-full">
                    <div class="flex-1 p-6 overflow-y-auto">
                        <h3 class="text-2xl font-bold mb-6">Create a new budget</h3>
                        
                        <div class="space-y-6">
                            <UFormField label="Budget Name" required>
                                <UInput
                                    v-model="budgetName"
                                    placeholder="e.g., Monthly Groceries"
                                    type="text"
                                    size="xl"
                                />
                            </UFormField>

                            <UFormField label="Amount" required>
                                <UInput
                                    v-model="amount"
                                    placeholder="0.00"
                                    type="number"
                                    step="0.01"
                                    size="xl"
                                />
                            </UFormField>

                            <UFormField label="Colour">
                                <BudgetsColorPicker v-model="budgetColor" />
                            </UFormField>

                            <UFormField label="Icon">
                                <BudgetsChooseIcon v-model="budgetIconChoice" :color="budgetColor" />
                            </UFormField>
                        </div>
                    </div>
                    
                    <div class="p-6 border-t">
                        <div class="flex gap-3">
                            <UButton
                                color="primary"
                                @click="handleCreateBudget"
                                class="flex-1"
                                size="lg"
                                :loading="createLoading"
                                :disabled="createLoading"
                            >
                                Create this budget
                            </UButton>
                            <UButton
                                color="neutral"
                                variant="outline"
                                @click="closeSlideover"
                                class="flex-1"
                                size="lg"
                                :disabled="createLoading"
                            >
                                Close
                            </UButton>
                        </div>
                    </div>
                </div>
            </template>
        </USlideover>
    </UContainer>
  </div>
</template>
