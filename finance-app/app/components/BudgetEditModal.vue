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

watch(() => props.activeTab, (newValue) => {
    if (newValue !== undefined) {
        tab.value = newValue
    }
})

function handleEditUpdate() {
    emit('update')
}

function handleEditCancel() {
    emit('cancel')
}

function handleEditDelete() {
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
    <div class="w-full h-140">
        <div class="flex">
            <h1 class="text-3xl font-bold mb-4 mt-4 ml-3 mr-3">{{ budgetName || 'Budget Details' }}</h1>

        </div>
        <div class="w-full">
            <UTabs color="info" :items="[{ icon: 'heroicons:plus-circle', slot: 'add-expense' }, { icon: 'heroicons:pencil-square', slot: 'edit' }, { icon: 'heroicons:list-bullet', slot: 'expenses' }]" v-model="tab" class="ml-2 mr-2">
                <template #add-expense>
                    <BudgetExpenseCreate
                        :budget-id="budgetId"
                        :budget-name="budgetName"
                        @update="handleExpenseCreated"
                        @cancel="handleExpensesCancel"
                    />
                </template>

                <template #edit="{ item }">
                    <BudgetEdit
                        :budget-id="budgetId"
                        :budget-name="budgetName"
                        :budget-amount="budgetAmount"
                        @update="handleEditUpdate"
                        @cancel="handleEditCancel"
                        @delete="handleEditDelete"
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
            </UTabs>
        </div>
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
