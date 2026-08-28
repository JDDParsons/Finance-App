<script setup lang="ts">
const props = defineProps<{
  disabled?: boolean
  reason?: string
  loading?: boolean
}>()

const emit = defineEmits<{ select: [] }>()
</script>

<template>
  <button
    type="button"
    class="group flex min-h-30 w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-gray-300 px-4 py-5 text-center text-gray-500 shadow-sm transition-all duration-200 enabled:hover:-translate-y-0.5 enabled:hover:border-primary-400 enabled:hover:text-primary-500 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:border-gray-700 dark:text-gray-400 dark:enabled:hover:border-primary-500 dark:enabled:hover:text-primary-400"
    :disabled="disabled || loading"
    :aria-label="reason || 'Copy budgets from previous month'"
    :title="reason"
    @click="emit('select')"
  >
    <span class="flex size-10 items-center justify-center rounded-full bg-gray-100 transition-colors group-enabled:group-hover:bg-primary-50 dark:bg-gray-800 dark:group-enabled:group-hover:bg-primary-950">
      <UIcon v-if="loading" name="heroicons-solid:arrow-path" class="size-5 animate-spin" />
      <UIcon v-else name="heroicons:document-duplicate" class="size-5" />
    </span>
    <span class="text-sm font-semibold">Copy previous month</span>
    <span v-if="reason" class="text-xs font-normal">{{ reason }}</span>
  </button>
</template>
