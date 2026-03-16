<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
    budgetId: string
    budgetName?: string
    budgetAmount?: number
    budgetHits?: any[]
    activeTab?: number
}>()

const emit = defineEmits<{
    update: []
    cancel: []
    delete: []
}>()

const tab = ref(props.activeTab ?? 0)
const isEditing = ref(false)

watch(() => props.activeTab, (newValue) => {
    if (newValue !== undefined) {
        tab.value = newValue
    }
})

function handleEditUpdate() {
    isEditing.value = false
    emit('update')
}

function handleEditCancel() {
    isEditing.value = false
    emit('cancel')
}

function handleEditDelete() {
    isEditing.value = false
    emit('delete')
}

function handleExpensesUpdate() {
    emit('update')
}

function handleExpensesCancel() {
    emit('cancel')
}

function handleExpenseCreated() {
    emit('update')
}
</script>

<template>
    <div class="w-full h-160">
        <div class="flex items-center justify-between mb-4 mt-4 ml-3 mr-3">
            <h1 class="text-3xl font-bold">{{ budgetName || 'Budget Details' }}</h1>
            <UButton
                icon="heroicons:pencil-square"
                color="secondary"
                variant="ghost"
                tabindex="-1"
                @click="isEditing = true"
            />
        </div>
        
        <div class="w-full">
            <UTabs color="info" :items="[{ icon: 'heroicons:plus-circle', slot: 'add-expense' }, { icon: 'heroicons:list-bullet', slot: 'expenses' }, { icon: 'heroicons:chart-pie', slot: 'details' }]" v-model="tab" class="ml-2 mr-2">
                <template #add-expense>
                    <BudgetExpenseCreate
                        :budget-id="budgetId"
                        :budget-name="budgetName"
                        @update="handleExpenseCreated"
                        @cancel="handleExpensesCancel"
                    />
                </template>

                <template #expenses="{ item }">
                    <BudgetExpensesList
                        :budget-id="budgetId"
                        :budget-hits="budgetHits"
                        @update="handleExpensesUpdate"
                        @cancel="handleExpensesCancel"
                    />
                </template>

                <template #details>
                    <BudgetDetails
                        :budget-amount="budgetAmount"
                        :budget-hits="budgetHits"
                    />
                </template>
            </UTabs>
        </div>
        <UModal v-if="isEditing" v-model:open="isEditing">
            <template #content>
                <UCard>
                    <template #header>
                        <h2 class="text-2xl font-bold">Edit Budget</h2>
                    </template>
                    <BudgetEdit
                        :budget-id="budgetId"
                        :budget-name="budgetName"
                        :budget-amount="budgetAmount"
                        @update="handleEditUpdate"
                        @cancel="handleEditCancel"
                        @delete="handleEditDelete"
                    />
                    
                    <template #footer>
                    <UButton
                        color="neutral"
                        variant="ghost"
                        @click="isEditing = false"
                        class="mr-2 mt-1"
                    >
                        Close
                    </UButton>
                    </template>
                </UCard>
            </template>
        </UModal>
        <hr class="border-gray-200 dark:border-gray-800">
        <UButton
            color="neutral"
            variant="ghost"
            @click="handleExpensesCancel"
            class="mr-2 mt-1 ml-auto"
        >
            Close
        </UButton>
    </div>
</template>
