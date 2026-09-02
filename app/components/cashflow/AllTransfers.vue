<script setup lang="ts">
import { useFinanceStore } from '~/stores/finance'

const store = useFinanceStore()
const accountMap = computed(() => new Map<string, string>(
  store.accounts.map((account: any) => [account.id, account.name || account.institution || 'Account'])
))

const sections = computed(() => {
  const grouped = new Map<string, any[]>()
  for (const transfer of store.transfers) {
    const date = String(transfer.date ?? '').slice(0, 10)
    if (!date) continue
    grouped.set(date, [...(grouped.get(date) ?? []), transfer])
  }
  return Array.from(grouped, ([date, transfers]) => ({ date, transfers }))
    .sort((a, b) => b.date.localeCompare(a.date))
})

function formatDate(date: string) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  })
}

function formatCurrency(amount: number | string | null) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(amount) || 0)
}

const selectedTransfer = ref<any>(null)
const isEditingTransfer = ref(false)

function openTransfer(transfer: any) {
  selectedTransfer.value = transfer
  isEditingTransfer.value = true
}

function closeTransfer() {
  isEditingTransfer.value = false
  selectedTransfer.value = null
}

async function deleteSelectedTransfer() {
  if (!selectedTransfer.value) return
  if (!confirm('Are you sure you want to delete this transfer? This action cannot be undone.')) return
  try {
    await store.removeTransfer(selectedTransfer.value.id)
    closeTransfer()
  } catch (err: any) {
    alert(err?.message || 'Failed to delete transfer')
  }
}
</script>

<template>
  <div class="flex flex-col gap-4 pt-4">
    <div v-if="store.loading" class="flex justify-center py-12">
      <UIcon name="heroicons-solid:arrow-path" class="size-8 animate-spin text-primary-500" />
    </div>
    <UAlert v-else-if="store.error" color="error" :description="store.error" />
    <div v-else-if="store.transfers.length === 0" class="py-16 text-center text-gray-400">
      No transfers recorded for this month. Tap <strong>+</strong> to add one.
    </div>
    <section v-for="section in sections" v-else :key="section.date" class="flex flex-col gap-2">
      <h3 class="text-sm font-semibold text-gray-600 dark:text-gray-300">{{ formatDate(section.date) }}</h3>
      <UCard
        v-for="transfer in section.transfers"
        :key="transfer.id"
        class="cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-900"
        role="button"
        tabindex="0"
        :aria-label="`Edit transfer from ${accountMap.get(transfer.account_id) ?? 'unknown account'} to ${accountMap.get(transfer.destination_account_id) ?? 'unknown account'}`"
        @click="openTransfer(transfer)"
        @keydown.enter="openTransfer(transfer)"
        @keydown.space.prevent="openTransfer(transfer)"
      >
        <div class="flex items-center gap-3">
          <div class="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300">
            <UIcon name="heroicons:arrows-right-left" class="size-5" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1 text-sm font-medium">
              <span class="truncate">{{ accountMap.get(transfer.account_id) ?? 'Unknown account' }}</span>
              <UIcon name="heroicons:arrow-right" class="size-4 shrink-0 text-gray-400" />
              <span class="truncate">{{ accountMap.get(transfer.destination_account_id) ?? 'Unknown account' }}</span>
            </div>
            <p class="mt-0.5 text-xs text-gray-400">Transfer</p>
          </div>
          <p class="shrink-0 font-semibold text-gray-900 dark:text-white">{{ formatCurrency(transfer.amount) }}</p>
        </div>
      </UCard>
    </section>
  </div>

  <UModal v-if="selectedTransfer" v-model:open="isEditingTransfer" @update:open="(open) => { if (!open) closeTransfer() }">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h2 class="text-2xl font-bold">Edit Transfer</h2>
            <UButton icon="heroicons-solid:trash" color="error" variant="ghost" size="sm" @click="deleteSelectedTransfer" />
          </div>
        </template>
        <TransferEdit
          :transfer-id="selectedTransfer.id"
          :transfer-amount="selectedTransfer.amount"
          :transfer-date="selectedTransfer.date"
          :from-account-id="selectedTransfer.account_id"
          :to-account-id="selectedTransfer.destination_account_id"
          @update="closeTransfer"
          @cancel="closeTransfer"
        />
      </UCard>
    </template>
  </UModal>
</template>
