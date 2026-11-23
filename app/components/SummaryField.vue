<script setup lang="ts">
// One label and value in a read-only transaction summary.
defineProps<{ label: string }>()
</script>

<template>
  <div>
    <dt class="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">{{ label }}</dt>
    <dd class="mt-0.5 text-base text-gray-900 dark:text-white">
      <slot />
    </dd>
  </div>
</template>
