<script setup lang="ts">
const props = defineProps<{
  open: boolean
  notes: string
}>()

const emit = defineEmits<{
  save: [notes: string]
  cancel: []
}>()
const fieldRef = ref<HTMLElement | null>(null)
const draftNotes = ref('')

function focusField() {
  if (!import.meta.client) return

  nextTick(() => {
    requestAnimationFrame(() => {
      const textarea = fieldRef.value?.querySelector('textarea')
      if (!(textarea instanceof HTMLTextAreaElement)) return
      textarea.focus()
    })
  })
}

function handleSave() {
  emit('save', draftNotes.value.trim())
}

watch(() => props.open, (open) => {
  if (!open) return
  draftNotes.value = props.notes
  focusField()
}, { immediate: true })
</script>

<template>
  <div class="p-4 pt-0">
    <div ref="fieldRef">
      <UTextarea
        v-model="draftNotes"
        variant="soft"
        color="neutral"
        placeholder="e.g. Receipt #1234, split with Sarah..."
        :rows="5"
        class="note-textarea w-full"
      />
    </div>

    <div class="mt-6 flex justify-end gap-2">
      <UButton color="neutral" variant="ghost" @click="emit('cancel')">
        Cancel
      </UButton>
      <UButton color="primary" @click="handleSave">
        Save
      </UButton>
    </div>
  </div>
</template>

<style scoped>
.note-textarea :deep(textarea) {
  font-size: 16px;
}
</style>
