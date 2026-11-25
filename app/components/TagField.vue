<script setup lang="ts">
import { useFinanceStore } from '~/stores/finance'
import { MAX_TAGS_PER_EXPENSE, normalizeTagName, suggestTags } from '../../utils/tags'

// The tag picker for an expense, in a modal opened from outside through `open()`.
// Tap a tag to add it, type a new name to create one, and Done saves the choice.
// An expense can have at most MAX_TAGS_PER_EXPENSE tags.
const props = defineProps<{ modelValue: string[] }>()

const emit = defineEmits<{ 'update:modelValue': [names: string[]] }>()

const store = useFinanceStore()

const isOpen = ref(false)
const draft = ref<string[]>([])
const typed = ref('')
const message = ref<string | null>(null)
const inputWrapper = ref<HTMLElement | null>(null)

function open() {
  draft.value = [...props.modelValue]
  typed.value = ''
  message.value = null
  isOpen.value = true
  if (!import.meta.client) return
  nextTick(() => requestAnimationFrame(() => {
    const input = inputWrapper.value?.querySelector('input')
    if (input instanceof HTMLInputElement) input.focus({ preventScroll: true })
  }))
}

defineExpose({ open })

const isFull = computed(() => draft.value.length >= MAX_TAGS_PER_EXPENSE)
const typedResult = computed(() => normalizeTagName(typed.value))
const suggestions = computed(() => suggestTags(store.tags, typed.value, draft.value))

// A typed name that is not an existing tag can be created.
const newName = computed(() => {
  const result = typedResult.value
  if (!typed.value.trim() || !result.ok) return null
  if (draft.value.includes(result.name) || store.tagsByName.has(result.name)) return null
  return result.name
})

watch(typed, () => { message.value = null })

function add(name: string) {
  if (draft.value.includes(name)) return
  if (isFull.value) {
    message.value = `An expense can have at most ${MAX_TAGS_PER_EXPENSE} tags. Remove one to add another.`
    return
  }
  draft.value = [...draft.value, name]
  typed.value = ''
}

function remove(name: string) {
  draft.value = draft.value.filter(item => item !== name)
  message.value = null
}

// Enter adds what was typed: the matching tag, or a new one.
function addTyped() {
  if (!typed.value.trim()) return
  const result = typedResult.value
  if (!result.ok) {
    message.value = result.message
    return
  }
  add(result.name)
}

function done() {
  emit('update:modelValue', [...draft.value])
  isOpen.value = false
}
</script>

<template>
  <UModal v-model:open="isOpen">
    <template #content>
      <UCard>
        <template #header>
          <div>
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white">Choose tags</h2>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Up to {{ MAX_TAGS_PER_EXPENSE }} tags ({{ draft.length }} chosen)
            </p>
          </div>
        </template>

        <div v-if="draft.length" class="mb-4 flex flex-wrap gap-2">
          <TagChip
            v-for="name in draft"
            :key="name"
            :name="name"
            :color="store.tagsByName.get(name)?.color"
            removable
            @remove="remove(name)"
          />
        </div>

        <div ref="inputWrapper">
          <UInput
            v-model="typed"
            variant="soft"
            color="neutral"
            placeholder="Find or add a tag..."
            size="xl"
            class="w-full"
            :disabled="isFull"
            aria-label="Find or add a tag"
            @keydown.enter.prevent="addTyped"
          />
        </div>

        <p v-if="message" class="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">{{ message }}</p>
        <p v-else-if="isFull" class="mt-2 text-sm text-gray-500 dark:text-gray-400">
          That is the most tags an expense can have. Remove one to add another.
        </p>

        <div v-if="!isFull && (newName || suggestions.length)" class="mt-4 flex flex-wrap gap-2">
          <button
            v-if="newName"
            type="button"
            class="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-dashed border-gray-400 px-2 py-0.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-500 dark:text-gray-200 dark:hover:bg-gray-800"
            @click="add(newName)"
          >
            <UIcon name="heroicons:plus" class="size-3" />
            <span class="truncate">Create {{ newName }}</span>
          </button>
          <TagChip
            v-for="tag in suggestions"
            :key="tag.id"
            :name="tag.name"
            :color="tag.color"
            interactive
            @click="add(tag.name)"
          />
        </div>

        <div class="mt-6 flex justify-end gap-2">
          <UButton color="neutral" variant="ghost" @click="isOpen = false">Cancel</UButton>
          <UButton color="primary" @click="done">Done</UButton>
        </div>
      </UCard>
    </template>
  </UModal>
</template>
