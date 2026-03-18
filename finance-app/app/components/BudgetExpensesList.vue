<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getBudgetHitsByBudgetId, deleteBudgetHit } from '../composables/supabase'
import { useFinanceStore } from '../stores/finance'

const props = defineProps<{
    budgetId: string
    budgetHits?: any[]
}>()

const store = useFinanceStore()

const accountMap = computed(() =>
    new Map<string, string>(store.accounts.map((a: any) => [a.id, a.name || a.institution || 'Account']))
)

const accountInstitutionMap = computed(() =>
    new Map<string, string | null>(store.accounts.map((a: any) => [a.id, a.institution ?? null]))
)

console.log("BudgetHits", props.budgetHits);

const hits = ref<any[]>([])
const error = ref<string | null>(null)

const selectedHit = ref<any>(null)
const isEditingHit = ref(false)

function handleEditHit(id: string) {
    selectedHit.value = props.budgetHits?.find((h: any) => h.id === id) ?? null
    if (selectedHit.value) isEditingHit.value = true
}

function handleEditHitClose() {
    isEditingHit.value = false
    selectedHit.value = null
    emit('update')
}

const emit = defineEmits<{
    update: [],
    cancel: []
}>()


async function handleDeleteHit(id: string) {
    if (!confirm('Are you sure you want to delete this budget hit?')) return
    try {
        await deleteBudgetHit(id)
        emit('update') // Notify parent to refresh the budget hits list
        const numberOfHits = props.budgetHits?.length || 0
        if (numberOfHits === 0) {
            emit('cancel') // Close the modal after deletion
        }
    } catch (err: any) {
        alert(err?.message || 'Failed to delete budget hit')
        console.error('Error deleting budget hit:', err)
    }
}   

</script>

<template>
    <div class="h-120 w-full"> 
    
        <h3 class="text-2xl font-semibold text-gray-500 pb-4 pt-4 pl-3">View Expenses</h3>

    <div v-if="error" class="mb-4">
        <UAlert
            title="Error"
            :description="error"
            color="error"
            variant="soft"
        />
    </div>

    <div v-else-if="props.budgetHits?.length === 0" class="text-center py-12">
        <p class="text-gray-400">No budget hits recorded yet.</p>
    </div>

    <div v-else class="">
            <!-- The flex-1 and min-h-0 here are key for iOS Safari -->
            <div class="flex-1 min-h-0">
            <UScrollArea class="max-h-104 pb-2">
                <div class="space-y-4 p-1">
                <ExpenseCard
                    v-for="hit in props.budgetHits"
                    :key="hit.id"
                    :id="hit.id"
                    :amount="hit.amount"
                    :date="hit.date"
                    :note="hit.note"
                    :account-name="hit.account_id ? accountMap.get(hit.account_id) ?? null : null"
                    :account-institution="hit.account_id ? accountInstitutionMap.get(hit.account_id) ?? null : null"
                    class="ml-2 mr-2"
                    @delete="handleDeleteHit"
                    @edit="handleEditHit"
                />
                </div>
            </UScrollArea>
            </div>
        </div>
    </div>

    <UModal v-if="selectedHit" v-model:open="isEditingHit" @update:open="(val) => { if (!val) handleEditHitClose() }">
        <template #content>
            <UCard>
                <template #header>
                    <h2 class="text-2xl font-bold">Edit Expense</h2>
                </template>
                <ExpenseEdit
                    :expense-id="selectedHit.id"
                    :expense-amount="selectedHit.amount"
                    :expense-date="selectedHit.date"
                    :expense-note="selectedHit.note"
                    :expense-budget-id="selectedHit.budget_id"
                    @update="handleEditHitClose"
                    @cancel="handleEditHitClose"
                    @delete="handleEditHitClose"
                />
                <template #footer>
                    <UButton color="neutral" variant="ghost" @click="handleEditHitClose" class="mr-2 mt-1">
                        Close
                    </UButton>
                </template>
            </UCard>
        </template>
    </UModal>
</template>

