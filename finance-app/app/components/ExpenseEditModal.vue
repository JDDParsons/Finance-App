<script setup lang="ts">
const props = defineProps<{
    expenseId: string
    expenseAmount?: number
    expenseDate?: string
    expenseNote?: string | null
    expenseBudgetId?: string | null
}>()

const emit = defineEmits<{
    update: []
    cancel: []
    delete: []
}>()
</script>

<template>
    <div class="w-full">
        <div class="flex items-center mb-4 mt-4 ml-3 mr-3">
            <h1 class="text-2xl font-bold">Edit Expense</h1>
        </div>

        <div class="ml-3 mr-3">
            <ExpenseEdit
                :expense-id="expenseId"
                :expense-amount="expenseAmount"
                :expense-date="expenseDate"
                :expense-note="expenseNote"
                :expense-budget-id="expenseBudgetId"
                @update="emit('update')"
                @cancel="emit('cancel')"
                @delete="emit('delete')"
            />
        </div>

        <hr class="border-gray-200 dark:border-gray-800 mt-4">
        <UButton
            color="neutral"
            variant="ghost"
            @click="emit('cancel')"
            class="mr-2 mt-1 ml-auto flex"
        >
            Close
        </UButton>
    </div>
</template>
