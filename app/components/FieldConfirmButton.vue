<script setup lang="ts">
// The circle check shown beside a field of an open expense while that field is being
// edited. Tapping it saves just that field.
defineProps<{
  label: string
  saving?: boolean
}>()

const emit = defineEmits<{
  confirm: []
}>()
</script>

<template>
  <UButton
    icon="heroicons-solid:check-circle"
    color="primary"
    variant="ghost"
    size="xs"
    class="shrink-0"
    :loading="saving"
    :disabled="saving"
    :aria-label="`Save ${label}`"
    @click="emit('confirm')"
  />
</template>
