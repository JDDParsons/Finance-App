<script setup lang="ts">
const props = defineProps<{
  id: string
  amount: number | null
  date: string | null
  note?: string | null
  budgetName?: string | null
}>()

const emit = defineEmits<{
  delete: [id: string]
  edit: [id: string]
}>()

function formatDate(dateString: string | null) {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

function formatCurrency(value: number | null) {
  if (value == null) return '-'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
}
</script>

<template>
  <UCard class="cursor-pointer" @click="emit('edit', id)">
    <div class="flex items-start justify-between gap-4">
      <div class="flex flex-col gap-1 flex-1">
        <div class="flex items-center gap-2">
          <span class="text-xl font-semibold text-info">{{ formatCurrency(amount) }}</span>
          <UBadge v-if="budgetName !== undefined" :color="budgetName ? 'primary' : 'warning'" variant="subtle" class="ml-auto">
            {{ budgetName || 'No budget' }}
          </UBadge>
        </div>
        <span class="text-sm text-gray-500">{{ formatDate(date) }}</span>
        <span v-if="note" class="text-sm text-gray-600 dark:text-gray-300">{{ note }}</span>
      </div>
      <UButton
        icon="heroicons-solid:trash"
        color="error"
        variant="ghost"
        size="sm"
        @click.stop="emit('delete', id)"
      />
    </div>
  </UCard>
</template>
