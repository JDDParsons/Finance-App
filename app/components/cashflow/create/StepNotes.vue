<script setup lang="ts">
const props = defineProps<{
  shouldAutofocus?: boolean
}>()

const notes = defineModel<string>({ default: '' })
const emit = defineEmits<{ continue: [] }>()
const fieldRef = ref<HTMLElement | null>(null)

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

watch(() => props.shouldAutofocus, (shouldAutofocus) => {
  if (!shouldAutofocus) return
  focusField()
}, { immediate: true })
</script>

<template>
  <div class="absolute inset-0 flex flex-col">
    <div class="shrink-0 px-4 pt-4 pb-0">
      <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
        Add a note
        <span class="text-base font-normal text-gray-400 dark:text-gray-500">(Optional)</span>
      </h2>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Any additional details?</p>
    </div>

    <div class="flex-1 min-h-0 overflow-y-auto px-4 py-4">
      <div ref="fieldRef">
        <UTextarea
          v-model="notes"
          variant="soft"
          color="neutral"
          placeholder="e.g. Receipt #1234, split with Sarah..."
          :rows="5"
          class="note-textarea w-full"
        />
      </div>
    </div>

      <UButton
        variant="ghost"
        color="neutral"
        size="xl"
        class="w-75 h-15 mb-4 mx-auto border 
        border-b-[3px] 
        bg-linear-to-r from-green-200 to-emerald-300 border-emerald-500 
        dark:from-green-500/60 dark:to-emerald-300/20 dark:border-emerald-500/50
        shadow-md dark:shadow-gray-700 
        justify-center rounded-full text-center text-base font-semibold 
        transition-all duration-100 ease-in-out
        active:brightness-110 active:border-emerald-700 active:shadow-lg active:scale-[0.98]"
        @click="emit('continue')"
      >
        Continue
      </UButton>
  </div>
</template>

<style scoped>
.note-textarea :deep(textarea) {
  font-size: 16px;
}
</style>
