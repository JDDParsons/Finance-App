<script setup lang="ts">
// The small pill used for payee, note, budget, date and account in the create flow.
// Every pill has the same size and text size. An empty pill is grey, a pill with a
// value is green, and a budget pill takes its own colour through `tint`. Text that
// does not fit is cut off with "...".
withDefaults(defineProps<{
  label: string
  icon?: string
  /** The pill holds a value, so it turns green. */
  filled?: boolean
  /** A colour (for a budget): tints the pill and the icon instead of grey or green. */
  tint?: string | null
  /** Use `label` when the pill wraps a hidden input, as the date pill does. */
  as?: 'button' | 'label'
}>(), {
  icon: undefined,
  filled: false,
  tint: null,
  as: 'button',
})
</script>

<template>
  <component
    :is="as"
    :type="as === 'button' ? 'button' : undefined"
    class="relative inline-flex h-8 w-[6.5rem] shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-2 text-xs font-medium transition-colors"
    :class="tint
      ? 'text-gray-700 hover:brightness-95 dark:text-gray-200'
      : filled
        ? 'bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-950/40 dark:text-green-300 dark:hover:bg-green-900/50'
        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'"
    :style="tint ? { backgroundColor: `${tint}33` } : undefined"
  >
    <slot name="icon">
      <UIcon v-if="icon" :name="icon" class="size-4 shrink-0" :style="tint ? { color: tint } : undefined" aria-hidden="true" />
    </slot>
    <span class="min-w-0 flex-1 truncate text-left">{{ label }}</span>
    <slot />
  </component>
</template>
