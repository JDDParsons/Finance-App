<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getStatementGroups } from '../composables/supabase'
import type { TableColumn } from '@nuxt/ui'

const loading = ref(true)
const rows = ref<{ year: number | null; month: string | null; name: string; transactions: number; rawGroup: string; dateUploaded: string | null }[]>([])
const error = ref<string | null>(null)

const columns: TableColumn<any>[] = [
  { accessorKey: 'year', header: 'Year' },
  { accessorKey: 'month', header: 'Month' },
  { accessorKey: 'name', header: 'Institution / Account' },
  {
    accessorKey: 'transactions',
    header: 'Number of transactions',
    meta: { class: { th: 'text-right', td: 'text-right' } }
  },
  {
    accessorKey: 'dateUploaded',
    header: 'Date uploaded',
    cell: ({ row }) => (row.getValue('dateUploaded') ? new Date(row.getValue('dateUploaded')).toLocaleString() : '-')
  }
]

onMounted(async () => {
  try {
    rows.value = await getStatementGroups()
  } catch (err: any) {
    error.value = err.message || 'Failed to load statements'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div>
    <UHeader title="Personal Finance App">
      <template #right>
        <UColorModeSwitch />
      </template>
    </UHeader>
    <UMain>
      <UContainer>
        <div class="flex justify-start pt-6 mb-4">
          <UButton to="/upload" color="neutral" variant="outline" size="xl">Back to Upload</UButton>
        </div>
        <div class="mt-6">
          <div v-if="loading">Loading statements…</div>
          <div v-else-if="error">{{ error }}</div>
          <div v-else>
            <UTable :data="rows" :columns="columns" :loading="loading" class="w-full" />
          </div>
        </div>
      </UContainer>
    </UMain>
  </div>
</template>
