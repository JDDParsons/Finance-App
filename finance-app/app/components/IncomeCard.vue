<script setup lang="ts">
const props = defineProps<{
  id: string
  amount: number | null
  date: string | null
  note?: string | null
  accountName?: string | null
}>()

const emit = defineEmits<{
  delete: [id: string]
}>()

function formatDate(val: string | null) {
  if (!val) return '—'
  return new Date(val).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function formatAmount(val: number | null) {
  if (val == null) return '—'
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(val)
}

function isFuture(val: string | null) {
  if (!val) return false
  return new Date(val) > new Date()
}
</script>

<template>
  <UCard>
    <div class="flex items-start justify-between gap-4">
      <div class="flex flex-col gap-1 flex-1">
        <div class="flex items-center gap-2">
          <span
            class="text-xl font-semibold"
            :class="isFuture(date) ? 'text-gray-400' : 'text-primary-500'"
          >{{ formatAmount(amount) }}</span>
          <UBadge v-if="isFuture(date)" color="neutral" variant="subtle" class="ml-auto">Scheduled</UBadge>
        </div>
        <span class="text-sm text-gray-500">{{ formatDate(date) }}</span>
        <span v-if="note" class="text-sm text-gray-600 dark:text-gray-300">{{ note }}</span>
        <span v-if="accountName" class="text-xs text-gray-400">{{ accountName }}</span>
      </div>
      <UButton
        icon="heroicons-solid:trash"
        color="error"
        variant="ghost"
        size="sm"
        @click="emit('delete', id)"
      />
    </div>
  </UCard>
</template>
