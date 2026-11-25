<script setup lang="ts">
defineProps<{ budgetId: string; records: any[] }>()
const emit = defineEmits<{ update: [] }>()

// Tapping a card expands it in place so its fields can be edited. One card at a time.
const expandedId = ref<string | null>(null)

function setExpanded(id: string, open: boolean) {
  if (open) expandedId.value = id
  else if (expandedId.value === id) expandedId.value = null
}
</script>

<template>
  <section>
    <h2 class="mb-4 text-xl font-bold">Income records</h2>
    <p v-if="!records.length" class="py-8 text-center text-gray-400">No income has been assigned to this budget.</p>
    <div v-else class="flex flex-col gap-3">
      <IncomeCard
        v-for="row in records"
        :key="row.id"
        :income-id="row.id"
        :expanded="expandedId === row.id"
        @update:expanded="setExpanded(row.id, $event)"
        @delete="emit('update')"
      />
    </div>
  </section>

</template>
