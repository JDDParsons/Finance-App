<script setup lang="ts">
withDefaults(defineProps<{
  visible: boolean
  label?: string
}>(), {
  label: 'Loading…',
})
</script>

<template>
  <Teleport to="body">
    <Transition name="loading-overlay">
      <div
        v-if="visible"
        class="fixed inset-0 z-[9998] flex items-center justify-center bg-white/55 backdrop-blur-sm dark:bg-gray-950/55"
        role="status"
        aria-live="polite"
        :aria-label="label"
      >
        <div class="flex flex-col items-center gap-3 rounded-2xl bg-white/90 px-8 py-6 shadow-xl ring-1 ring-gray-200 dark:bg-gray-900/90 dark:ring-gray-800">
          <UIcon name="heroicons-solid:arrow-path" class="size-9 animate-spin text-primary" aria-hidden="true" />
          <span class="text-sm font-medium text-gray-700 dark:text-gray-200">{{ label }}</span>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.loading-overlay-enter-active,
.loading-overlay-leave-active {
  transition: opacity 0.15s ease;
}

.loading-overlay-enter-from,
.loading-overlay-leave-to {
  opacity: 0;
}
</style>
