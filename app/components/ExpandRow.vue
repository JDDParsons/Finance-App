<script setup lang="ts">
// One row of an expense card. A row that is not `open` collapses to nothing (used for
// empty fields that only show while the card is expanded), and the space above the row
// grows or shrinks with `expanded`. Both changes are animated.
withDefaults(defineProps<{
  open?: boolean
  expanded?: boolean
  collapsedPad?: string
  expandedPad?: string
}>(), {
  open: true,
  expanded: false,
  collapsedPad: 'pt-1.5',
  expandedPad: 'pt-4',
})
</script>

<template>
  <div
    class="grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none"
    :class="open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'"
    :inert="!open"
  >
    <div class="-mx-1 min-h-0 overflow-hidden px-1">
      <div class="pb-1 -mb-1 transition-[padding] duration-300 ease-out motion-reduce:transition-none" :class="expanded ? expandedPad : collapsedPad">
        <slot />
      </div>
    </div>
  </div>
</template>
