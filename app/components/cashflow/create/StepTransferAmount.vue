<script setup lang="ts">
import { useFinanceStore } from '~/stores/finance'

const props = defineProps<{
  fromAccountId: string
  toAccountId: string
  loading: boolean
  error: string | null
}>()

const amount = defineModel<string>('amount', { default: '' })
const date = defineModel<string>('date', { default: '' })
const emit = defineEmits<{ changeAccounts: []; submit: [] }>()
const store = useFinanceStore()

function account(id: string) {
  return store.accounts.find((item: any) => item.id === id) ?? null
}

function accountName(id: string) {
  const item = account(id)
  return item?.name || item?.institution || 'Account'
}

const displayAmount = computed(() => new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2,
}).format(Number(amount.value) || 0))
</script>

<template>
  <div class="absolute inset-0 flex flex-col overflow-hidden">
    <div v-if="error" class="p-4 pb-0">
      <UAlert title="Error" :description="error" color="error" variant="soft" />
    </div>

    <div class="flex min-h-0 flex-1 flex-col justify-end">
      <div class="px-4 py-16 text-center">
        <p class="text-7xl font-light tracking-tight text-gray-900 dark:text-white sm:text-8xl">
          {{ displayAmount }}
        </p>
      </div>

      <div class="flex flex-wrap items-center justify-center gap-3 px-4 pb-4">
        <button
          type="button"
          class="inline-flex cursor-pointer items-center gap-2 rounded-full border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:border-gray-300 dark:border-gray-700 dark:text-gray-200"
          aria-label="Change transfer accounts"
          @click="emit('changeAccounts')"
        >
          <AccountVisual :account="account(props.fromAccountId)" size="sm" />
          <span class="max-w-28 truncate">{{ accountName(props.fromAccountId) }}</span>
          <UIcon name="heroicons:arrow-right" class="size-4 shrink-0 text-primary-500" />
          <AccountVisual :account="account(props.toAccountId)" size="sm" />
          <span class="max-w-28 truncate">{{ accountName(props.toAccountId) }}</span>
        </button>
        <DateTagPicker v-model="date" />
      </div>
    </div>

    <AmountNumberPad v-model="amount" />

    <div class="shrink-0 bg-green-50 px-4 pb-4 dark:bg-green-900/40">
      <UButton
        class="mx-auto flex h-[3.75rem] w-[22.5rem] justify-center rounded-full border-2 border-green-500 bg-linear-to-r from-green-400 to-emerald-500 text-base font-semibold text-white shadow-lg shadow-green-500/30"
        :disabled="loading"
        :loading="loading"
        @click="emit('submit')"
      >
        Submit transfer
      </UButton>
    </div>
  </div>
</template>
