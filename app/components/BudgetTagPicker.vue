<script setup lang="ts">
import { useBudgetIcon } from '~/composables/useBudgetIcon'

interface BudgetLike {
  id: string
  name: string
  color?: string | null
  icon?: string | null
}

const props = withDefaults(defineProps<{
  modelValue?: string | null
  budgets?: BudgetLike[]
}>(), {
  modelValue: null,
  budgets: () => []
})

const emit = defineEmits<{
  'update:modelValue': [value: string | null]
}>()

const { budgetIcon } = useBudgetIcon()
const open = ref(false)

const selectedBudget = computed(() =>
  props.budgets.find(budget => budget.id === props.modelValue) ?? null
)

function selectBudget(budgetId: string | null) {
  emit('update:modelValue', budgetId)
  open.value = false
}
</script>

<template>
  <UPopover v-model:open="open">
    <button
      type="button"
      class="inline-flex cursor-pointer items-center gap-2 rounded-full border border-gray-200 px-3 py-1.5 text-sm text-gray-600 transition-colors hover:border-gray-300 dark:border-gray-700 dark:text-gray-300 dark:hover:border-gray-600"
      :aria-label="selectedBudget ? `Change budget from ${selectedBudget.name}` : 'Choose budget'"
    >
      <div
        v-if="selectedBudget"
        class="flex size-7 shrink-0 items-center justify-center rounded-full"
        :style="selectedBudget.color ? { backgroundColor: `${selectedBudget.color}33`, borderColor: selectedBudget.color, border: '1.5px solid' } : {}"
        :class="!selectedBudget.color ? 'bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600' : ''"
      >
        <UIcon
          :name="selectedBudget.icon ?? budgetIcon(selectedBudget.name)"
          class="size-4"
          :style="selectedBudget.color ? { color: selectedBudget.color } : {}"
          :class="!selectedBudget.color ? 'text-gray-500 dark:text-gray-400' : ''"
        />
      </div>
      <div
        v-else
        class="flex size-7 shrink-0 items-center justify-center rounded-full border border-dashed border-gray-300 bg-gray-100 dark:border-gray-600 dark:bg-gray-800"
      >
        <UIcon name="heroicons:x-mark" class="size-4 text-gray-400" />
      </div>
      <span class="max-w-32 truncate">{{ selectedBudget?.name ?? 'No budget' }}</span>
    </button>

    <template #content>
      <div class="min-w-52 p-2">
        <div class="flex flex-col gap-1">
          <button
            type="button"
            class="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
            :class="props.modelValue === null ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300' : ''"
            @click="selectBudget(null)"
          >
            <div class="flex size-5 shrink-0 items-center justify-center rounded-full border border-dashed border-gray-300 bg-gray-100 dark:border-gray-600 dark:bg-gray-800">
              <UIcon name="heroicons:x-mark" class="size-3 text-gray-400" />
            </div>
            <span>No budget</span>
          </button>

          <button
            v-for="budget in props.budgets"
            :key="budget.id"
            type="button"
            class="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors cursor-pointer"
            :class="budget.id === props.modelValue
              ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
              : 'hover:bg-gray-100 dark:hover:bg-gray-800'"
            @click="selectBudget(budget.id)"
          >
            <div
              class="flex size-5 shrink-0 items-center justify-center rounded-full"
              :style="budget.color ? { backgroundColor: `${budget.color}33`, borderColor: budget.color, border: '1.5px solid' } : {}"
              :class="!budget.color ? 'bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600' : ''"
            >
              <UIcon
                :name="budget.icon ?? budgetIcon(budget.name)"
                class="size-3"
                :style="budget.color ? { color: budget.color } : {}"
                :class="!budget.color ? 'text-gray-500 dark:text-gray-400' : ''"
              />
            </div>
            <span class="truncate">{{ budget.name }}</span>
          </button>
        </div>
      </div>
    </template>
  </UPopover>
</template>
