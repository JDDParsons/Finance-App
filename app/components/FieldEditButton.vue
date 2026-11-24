<script setup lang="ts">
// The edit control beside one field of an open expense. A pencil starts editing that
// field; while it is being edited the pencil becomes a circle check that confirms it.
// `locked` hides the pencil while another field is being edited.
defineProps<{
  label: string
  editing: boolean
  locked: boolean
  saving?: boolean
}>()

const emit = defineEmits<{
  edit: []
  confirm: []
}>()
</script>

<template>
  <span class="flex w-7 shrink-0 justify-center">
    <UButton
      v-if="editing"
      icon="heroicons-solid:check-circle"
      color="primary"
      variant="ghost"
      size="xs"
      :loading="saving"
      :disabled="saving"
      :aria-label="`Save ${label}`"
      @click="emit('confirm')"
    />
    <UButton
      v-else-if="!locked"
      icon="heroicons:pencil-square"
      color="neutral"
      variant="ghost"
      size="xs"
      :aria-label="`Edit ${label}`"
      @click="emit('edit')"
    />
  </span>
</template>
