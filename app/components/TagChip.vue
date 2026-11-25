<script setup lang="ts">
// A tag shown as a small pill with a dot in the tag's color. It is a button when it can be
// tapped (to pick it) and can show an x to remove it.
withDefaults(defineProps<{
  name: string
  color?: string | null
  interactive?: boolean
  removable?: boolean
}>(), {
  color: null,
  interactive: false,
  removable: false,
})

const emit = defineEmits<{ remove: [] }>()
</script>

<template>
  <component
    :is="interactive ? 'button' : 'span'"
    :type="interactive ? 'button' : undefined"
    class="inline-flex max-w-full items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium text-gray-700 dark:text-gray-200"
    :class="interactive ? 'cursor-pointer transition-[filter] hover:brightness-95' : ''"
    :style="{ backgroundColor: `${color || '#9ca3af'}33` }"
  >
    <span class="size-2 shrink-0 rounded-full" :style="{ backgroundColor: color || '#9ca3af' }" aria-hidden="true" />
    <span class="truncate">{{ name }}</span>
    <button
      v-if="removable"
      type="button"
      class="-mr-0.5 flex shrink-0 cursor-pointer items-center rounded-full"
      :aria-label="`Remove ${name}`"
      @click.stop="emit('remove')"
    >
      <UIcon name="heroicons:x-mark" class="size-3" />
    </button>
  </component>
</template>
