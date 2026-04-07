<script setup lang="ts">
const props = defineProps<{
    budgets: any[]
}>()

const emit = defineEmits<{
    select: [{ budgetId: string | null; budgetName: string | null; noBudget: boolean }]
}>()

const { budgetIcon } = useBudgetIcon()

function choose(budget: any) {
    emit('select', { budgetId: budget.id, budgetName: budget.name, noBudget: false })
}

function chooseNoBudget() {
    emit('select', { budgetId: null, budgetName: null, noBudget: true })
}
</script>

<template>
    <div class="w-full">
        <p class="text-sm text-gray-400 mb-4">Select a budget for this expense</p>

        <div class="grid grid-cols-3 gap-3">
            <!-- Budget options -->
            <button
                v-for="budget in budgets"
                :key="budget.id"
                type="button"
                class="flex flex-col items-center gap-2 p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-primary-400 dark:hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all active:scale-95 cursor-pointer"
                @click="choose(budget)"
            >
                <!-- Coloured icon circle -->
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
    </div>
</template>
