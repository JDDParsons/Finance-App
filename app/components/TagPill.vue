<script setup lang="ts">
// The small pill used for payee, note, budget, date and account in the create flow.
// Every pill has the same height and text size, and is as wide as its text up to a maximum. An empty pill is outlined in blue, a pill with a
// value is filled light blue, and a budget pill takes its own colour through `tint`. Text that
// does not fit is cut off with "...".
withDefaults(defineProps<{
  label: string
  icon?: string
  /** The pill holds a value, so it is filled light blue. */
  filled?: boolean
  /** A colour (for a budget): tints the pill and the icon instead of blue. */
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
    class="relative inline-flex h-8 max-w-[6.5rem] shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-2 text-xs font-medium transition-colors"
    :class="tint
      ? 'border-transparent text-gray-700 hover:brightness-95 dark:text-gray-200'
      : filled
        ? 'border-transparent bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:hover:bg-blue-900/60'
        : 'border-blue-500 bg-transparent text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-300 dark:hover:bg-blue-950/30'"
    :style="tint ? { backgroundColor: `${tint}33` } : undefined"
  >
    <slot name="icon">
      <UIcon v-if="icon" :name="icon" class="size-4 shrink-0" :style="tint ? { color: tint } : undefined" aria-hidden="true" />
    </slot>
    <span class="min-w-0 truncate text-left">{{ label }}</span>
    <slot />
  </component>
</template>
