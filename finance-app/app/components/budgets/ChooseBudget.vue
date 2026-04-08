<script setup lang="ts">
const props = defineProps<{
    budgets: any[]
    expensesOnly?: boolean
}>()

const emit = defineEmits<{
    select: [{ budgetId: string | null; budgetName: string | null; noBudget: boolean; type: 'expense' | 'income' }]
}>()

const { budgetIcon } = useBudgetIcon()

const activeTab = ref('expenses')

const tabs = [
    { label: 'Expenses', value: 'expenses', slot: 'expenses', icon: 'heroicons-solid:arrow-trending-down' },
    { label: 'Income', value: 'income', slot: 'income', icon: 'heroicons-solid:arrow-trending-up' },
]

function choose(budget: any) {
    emit('select', { budgetId: budget.id, budgetName: budget.name, noBudget: false, type: 'expense' })
}

function chooseNoBudget() {
    emit('select', { budgetId: null, budgetName: null, noBudget: true, type: 'expense' })
}

function choosePaycheck() {
    emit('select', { budgetId: null, budgetName: null, noBudget: true, type: 'income' })
}
</script>

<template>
    <div class="w-full">
        <!-- Expenses-only mode: no tabs -->
        <template v-if="expensesOnly">
            <div class="grid grid-cols-3 gap-3">
                <button
                    v-for="budget in budgets"
                    :key="budget.id"
                    type="button"
                    class="flex flex-col items-center gap-2 p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-primary-400 dark:hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all active:scale-95 cursor-pointer"
                    @click="choose(budget)"
                >
                    <div
                        class="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
                        :style="budget.color ? { backgroundColor: budget.color + '33', borderColor: budget.color, border: '2px solid' } : {}"
                        :class="!budget.color ? 'bg-gray-100 dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600' : ''"
                    >
                        <UIcon
                            :name="budgetIcon(budget.name)"
                            class="size-5"
                            :style="budget.color ? { color: budget.color } : {}"
                            :class="!budget.color ? 'text-gray-500 dark:text-gray-400' : ''"
                        />
                    </div>
                    <span class="text-xs text-center leading-tight text-gray-700 dark:text-gray-300 line-clamp-2">{{ budget.name }}</span>
                </button>
                <button
                    type="button"
                    class="flex flex-col items-center gap-2 p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-all active:scale-95 cursor-pointer"
                    @click="chooseNoBudget"
                >
                    <div class="w-11 h-11 rounded-full flex items-center justify-center shrink-0 bg-gray-100 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600">
                        <UIcon name="heroicons:x-mark" class="size-5 text-gray-400" />
                    </div>
                    <span class="text-xs text-center leading-tight text-gray-500 dark:text-gray-400">No budget</span>
                </button>
            </div>
        </template>

        <!-- Tabbed mode: expenses + income -->
        <template v-else>
        <UTabs
            v-model="activeTab"
            :items="tabs"
            color="primary"
            class="mb-5"
        >
            <template #expenses>
                <div class="grid grid-cols-3 gap-3 pt-1">
                    <!-- Budget options -->
                    <button
                        v-for="budget in budgets"
                        :key="budget.id"
                        type="button"
                        class="flex flex-col items-center gap-2 p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-primary-400 dark:hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all active:scale-95 cursor-pointer"
                        @click="choose(budget)"
                    >
                        <div
                            class="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
                            :style="budget.color ? { backgroundColor: budget.color + '33', borderColor: budget.color, border: '2px solid' } : {}"
                            :class="!budget.color ? 'bg-gray-100 dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600' : ''"
                        >
                            <UIcon
                                :name="budgetIcon(budget.name)"
                                class="size-5"
                                :style="budget.color ? { color: budget.color } : {}"
                                :class="!budget.color ? 'text-gray-500 dark:text-gray-400' : ''"
                            />
                        </div>
                        <span class="text-xs text-center leading-tight text-gray-700 dark:text-gray-300 line-clamp-2">{{ budget.name }}</span>
                    </button>

                    <!-- No budget option -->
                    <button
                        type="button"
                        class="flex flex-col items-center gap-2 p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-all active:scale-95 cursor-pointer"
                        @click="chooseNoBudget"
                    >
                        <div class="w-11 h-11 rounded-full flex items-center justify-center shrink-0 bg-gray-100 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600">
                            <UIcon name="heroicons:x-mark" class="size-5 text-gray-400" />
                        </div>
                        <span class="text-xs text-center leading-tight text-gray-500 dark:text-gray-400">No budget</span>
                    </button>
                </div>
            </template>

            <template #income>
                <div class="grid grid-cols-3 gap-3 pt-1">
                    <!-- Paycheck option -->
                    <button
                        type="button"
                        class="flex flex-col items-center gap-2 p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-primary-400 dark:hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all active:scale-95 cursor-pointer"
                        @click="choosePaycheck"
                    >
                        <div class="w-11 h-11 rounded-full flex items-center justify-center shrink-0 bg-green-50 dark:bg-green-900/30 border-2 border-green-400 dark:border-green-500">
                            <UIcon name="heroicons:banknotes-solid" class="size-5 text-green-500" />
                        </div>
                        <span class="text-xs text-center leading-tight text-gray-700 dark:text-gray-300">Paycheck</span>
                    </button>
                </div>
            </template>
        </UTabs>
        </template>
    </div>
</template>
