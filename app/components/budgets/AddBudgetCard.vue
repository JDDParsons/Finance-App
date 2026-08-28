<script setup lang="ts">
const emit = defineEmits<{
  select: []
}>()
</script>

<template>
  <button
    type="button"
    class="group flex min-h-30 w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-gray-300 px-4 py-5 text-center text-gray-500 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary-400 hover:text-primary-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:border-gray-700 dark:text-gray-400 dark:hover:border-primary-500 dark:hover:text-primary-400"
    aria-label="Add a new budget"
    @click="emit('select')"
  >
    <span
      class="flex size-10 items-center justify-center rounded-full bg-gray-100 transition-colors group-hover:bg-primary-50 dark:bg-gray-800 dark:group-hover:bg-primary-950"
    >
      <UIcon name="heroicons-solid:plus" class="size-5" />
    </span>
    <span class="text-sm font-semibold">Add budget</span>
  </button>
</template>
