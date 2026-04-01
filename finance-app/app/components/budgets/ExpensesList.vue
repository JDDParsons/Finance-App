<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getBudgetHitsByBudgetId, deleteBudgetHit } from '~/composables/supabase'
import { useFinanceStore } from '~/stores/finance'

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

function formatDate(dateString: string | null) {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC',
    })
}

function formatCurrency(value: number | null) {
    if (value == null) return '-'
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
}

const tableColumns = [
    { accessorKey: 'date',    header: 'Date',    id: 'date'    },
    { accessorKey: 'amount',  header: 'Amount',  id: 'amount'  },
    { accessorKey: 'note',    header: 'Note',    id: 'note'    },
    { accessorKey: 'account', header: 'Account', id: 'account' },
    { id: 'actions',          header: ''                       },
]

</script>

<template>
    <div class="w-full"> 
    
    <div v-if="error" class="mb-4">
        <UAlert
            title="Error"
            :description="error"
            color="error"
            variant="soft"
        />
    </div>

    <div v-else-if="props.budgetHits?.length === 0" class="py-12">
        <p class="text-gray-400">When you add an expense, it will appear here.</p>
    </div>

    <template v-else>
        <!-- Mobile: cards -->
        <div class="lg:hidden">
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

        <!-- Desktop: table -->
        <div class="hidden lg:block">
            <UTable
                :data="props.budgetHits"
                :columns="tableColumns"
            >
                <template #date-cell="{ row }">{{ formatDate(row.original.date) }}</template>
                <template #amount-cell="{ row }">{{ formatCurrency(row.original.amount) }}</template>
                <template #note-cell="{ row }">{{ row.original.note || '-' }}</template>
                <template #account-cell="{ row }">
                    {{ row.original.account_id ? accountMap.get(row.original.account_id) ?? '-' : '-' }}
                </template>
                <template #actions-cell="{ row }">
                    <div class="flex items-center gap-1">
                        <UButton
                            icon="heroicons-solid:pencil"
                            color="neutral"
                            variant="ghost"
                            size="xs"
                            @click="handleEditHit(row.original.id)"
                        />
                        <UButton
                            icon="heroicons-solid:trash"
                            color="error"
                            variant="ghost"
                            size="xs"
                            @click="handleDeleteHit(row.original.id)"
                        />
                    </div>
                </template>
            </UTable>
        </div>
    </template>
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

