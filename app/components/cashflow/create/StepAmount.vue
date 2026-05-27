<script setup lang="ts">
import { useFinanceStore } from '~/stores/finance'
import { useBudgetIcon } from '~/composables/useBudgetIcon'

const props = defineProps<{
  entity: string
  transactionType: 'expense' | 'income'
  selectedBudgetId: string
  noBudget: boolean
  loading: boolean
  error: string | null
}>()

const amount = defineModel<string>('amount', { default: '' })
const date = defineModel<string>('date', { default: '' })
const accountId = defineModel<string | null>('accountId', { default: null })

const emit = defineEmits<{
  changeBudget: []
  submit: []
}>()

const store = useFinanceStore()
const { budgetIcon } = useBudgetIcon()

const isIncome = computed(() => props.transactionType === 'income')

const activeBudgetId = computed(() => {
  if (isIncome.value || props.noBudget) return null
  return props.selectedBudgetId || null
})

const expensePillBudget = computed(() =>
  store.budgets.find((b: any) => b.id === activeBudgetId.value) ?? null
)

const typePillLabel = computed(() =>
  isIncome.value ? 'Paycheck' : (expensePillBudget.value?.name ?? 'No budget')
)

const typePillAriaLabel = computed(() =>
  isIncome.value
    ? 'Change type'
    : (expensePillBudget.value ? `Change budget from ${expensePillBudget.value.name}` : 'Choose budget')
)

const displayAmount = computed(() => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(parseFloat(amount.value || '0'))
})

const submitLabel = computed(() => isIncome.value ? 'Submit income' : 'Submit expense')
</script>

<template>
  <div class="absolute inset-0 flex flex-col overflow-hidden">
    <div v-if="error" class="p-4 pb-0">
      <UAlert title="Error" :description="error" color="error" variant="soft" />
    </div>

    <div class="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div v-if="entity" class="flex p-4 pb-0">
        <span class="rounded-full border border-green-200 bg-green-50 px-3 py-1.5 text-sm text-green-700 dark:border-green-900/60 dark:bg-green-950/40 dark:text-green-300">
          {{ entity }}
        </span>
      </div>

      <div class="flex min-h-0 flex-1 flex-col justify-end">
        <div class="px-4 py-24 text-center">
          <p class="text-7xl font-light tracking-tight text-gray-900 dark:text-white sm:text-8xl">
            {{ displayAmount }}
          </p>
        </div>

        <div class="px-4 pb-4">
          <div class="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              class="inline-flex cursor-pointer items-center gap-2 rounded-full border border-gray-200 px-3 py-1.5 text-sm text-gray-600 transition-colors hover:border-gray-300 dark:border-gray-700 dark:text-gray-300 dark:hover:border-gray-600"
              :aria-label="typePillAriaLabel"
              @click="emit('changeBudget')"
            >
              <div
                v-if="isIncome"
                class="flex size-7 shrink-0 items-center justify-center rounded-full border border-green-400 bg-green-50 dark:border-green-500 dark:bg-green-900/30"
              >
                <UIcon name="heroicons:banknotes-solid" class="size-4 text-green-500" />
              </div>
              <div
                v-else-if="expensePillBudget"
                class="flex size-7 shrink-0 items-center justify-center rounded-full"
                :style="expensePillBudget.color ? { backgroundColor: `${expensePillBudget.color}33`, borderColor: expensePillBudget.color, border: '1.5px solid' } : {}"
                :class="!expensePillBudget.color ? 'border border-gray-300 bg-gray-100 dark:border-gray-600 dark:bg-gray-800' : ''"
              >
                <UIcon
                  :name="expensePillBudget.icon ?? budgetIcon(expensePillBudget.name)"
                  class="size-4"
                  :style="expensePillBudget.color ? { color: expensePillBudget.color } : {}"
                  :class="!expensePillBudget.color ? 'text-gray-500 dark:text-gray-400' : ''"
                />
              </div>
              <div
                v-else
                class="flex size-7 shrink-0 items-center justify-center rounded-full border border-dashed border-gray-300 bg-gray-100 dark:border-gray-600 dark:bg-gray-800"
              >
                <UIcon name="heroicons:x-mark" class="size-4 text-gray-400" />
              </div>
              <span class="max-w-32 truncate">{{ typePillLabel }}</span>
            </button>

            <DateTagPicker v-model="date" />
            <AccountTagPicker v-model="accountId" :accounts="store.accounts" />
          </div>
        </div>
      </div>

      <AmountNumberPad v-model="amount" />

      <div class="shrink-0 bg-green-50 px-4 pb-4 dark:bg-green-900/40">
        <UButton
          color="primary"
          variant="ghost"
          class="mx-auto flex h-15 w-90 justify-center rounded-full 
          border-2 border-green-500 bg-linear-to-r from-green-400 to-emerald-500 
          dark:border-emerald-500/50 dark:from-green-500/80 dark:to-emerald-400/30
          text-center text-base font-semibold text-white 
          shadow-lg shadow-green-500/30 
          transition-all duration-200 
          hover:from-green-500 hover:to-emerald-600 hover:shadow-green-500/50 
          active:scale-[0.95] active:brightness-110"
          :disabled="loading"
          :loading="loading"
          @click="emit('submit')"
        >
          {{ submitLabel }}
        </UButton>
      </div>
    </div>
  </div>
</template>
