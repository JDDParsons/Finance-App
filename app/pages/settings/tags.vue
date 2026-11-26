<script setup lang="ts">
import { useTagsApi } from '~/composables/api/useTagsApi'
import { useFinanceStore } from '~/stores/finance'
import { TAG_COLORS, normalizeTagName, type TagSummary } from '../../../utils/tags'

useHead({ title: 'Tags | Budgify' })

const router = useRouter()
const appData = useAppData()
const store = useFinanceStore()
const { listTags, updateTag, deleteTag } = useTagsApi()

function goBack() {
  if (import.meta.client && window.history.length > 1) router.back()
  else router.push('/settings')
}

// --- List ---
const tags = ref<TagSummary[]>([])
const loading = ref(true)
const loadError = ref<string | null>(null)
const search = ref('')

const visibleTags = computed(() => {
  const term = search.value.trim().replace(/^#/, '').toLowerCase()
  return term ? tags.value.filter(tag => tag.name.includes(term)) : tags.value
})

function describeUse(count: number) {
  return `${count} expense${count === 1 ? '' : 's'}`
}

async function load() {
  loading.value = true
  loadError.value = null
  try {
    if (appData.isOffline.value) {
      // The tags are saved on this device, but the counts need the server.
      tags.value = store.tags
        .filter(tag => !tag.pending)
        .map(tag => ({ ...tag, expenseCount: 0 }))
        .sort((a, b) => a.name.localeCompare(b.name))
    } else {
      tags.value = await listTags()
    }
  } catch (error: any) {
    loadError.value = error?.data?.statusMessage || 'Could not load your tags.'
  } finally {
    loading.value = false
  }
}

onMounted(load)
// Reload when the connection comes back so the counts return.
watch(() => appData.isOffline.value, () => { void load() })

// --- Edit and delete ---
const isEditOpen = ref(false)
const editing = ref<TagSummary | null>(null)
const nameInput = ref('')
const colorInput = ref('')
const step = ref<'edit' | 'delete'>('edit')
const saving = ref(false)
const actionError = ref<string | null>(null)
const preparing = ref(false)
const blockedMessage = ref<string | null>(null)

const nameResult = computed(() => normalizeTagName(nameInput.value))
const nameError = computed(() => {
  const result = nameResult.value
  if (!result.ok) return result.message
  const clash = tags.value.find(tag => tag.name === result.name && tag.id !== editing.value?.id)
  return clash ? `${clash.name} already exists. Tag names must be different.` : null
})
const hasChanges = computed(() => {
  const tag = editing.value
  if (!tag) return false
  const result = nameResult.value
  return (result.ok && result.name !== tag.name) || colorInput.value !== tag.color
})
const canSave = computed(() => hasChanges.value && !nameError.value && !blockedMessage.value)

function waitingChanges() {
  return appData.pendingSyncCount.value + appData.failedSyncCount.value
}

// A queued expense that is retried after a rename or delete would bring the old tag back,
// so anything still waiting on this device is synced or resolved first.
async function ensureQueueEmpty() {
  if (waitingChanges() && !appData.failedSyncCount.value) await appData.syncOutbox()
  const waiting = waitingChanges()
  if (!waiting) return null
  const failed = appData.failedSyncCount.value
  return failed
    ? `${failed} change${failed === 1 ? '' : 's'} could not sync. Retry or discard ${failed === 1 ? 'it' : 'them'} on your profile page before changing tags.`
    : `${waiting} change${waiting === 1 ? ' is' : 's are'} still waiting to sync. Try again once they have synced.`
}

async function openEdit(tag: TagSummary) {
  if (appData.isOffline.value) return
  actionError.value = null
  preparing.value = true
  try {
    blockedMessage.value = await ensureQueueEmpty()
  } finally {
    preparing.value = false
  }
  editing.value = tag
  nameInput.value = tag.name
  colorInput.value = tag.color
  step.value = 'edit'
  isEditOpen.value = true
}

async function refreshEverywhere() {
  isEditOpen.value = false
  // Reload the list, then the open month and the saved months, so the change shows everywhere.
  await load()
  await appData.refresh()
  void appData.precacheRecentMonths(true)
}

function errorText(error: any, fallback: string) {
  return error?.data?.statusMessage || error?.statusMessage || error?.message || fallback
}

async function save() {
  const tag = editing.value
  const result = nameResult.value
  if (!tag || !canSave.value || !result.ok) return
  saving.value = true
  actionError.value = null
  try {
    const changes: { name?: string; color?: string } = {}
    if (result.name !== tag.name) changes.name = result.name
    if (colorInput.value !== tag.color) changes.color = colorInput.value
    await updateTag(tag.id, changes)
    await refreshEverywhere()
  } catch (error: any) {
    actionError.value = errorText(error, 'Could not save. Try again.')
  } finally {
    saving.value = false
  }
}

async function confirmDelete() {
  const tag = editing.value
  if (!tag) return
  saving.value = true
  actionError.value = null
  try {
    await deleteTag(tag.id)
    await refreshEverywhere()
  } catch (error: any) {
    actionError.value = errorText(error, 'Could not delete. Try again.')
    step.value = 'edit'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div>
    <AppHeader title="Tags" />

    <UContainer class="py-6">
      <div class="mb-4 flex items-center justify-between">
        <UButton icon="heroicons-solid:arrow-left" color="neutral" variant="ghost" aria-label="Go back" @click="goBack" />
      </div>

      <h1 class="text-center text-2xl font-bold">Tags</h1>
      <p class="mt-1 text-center text-sm text-gray-500 dark:text-gray-400">
        Rename, recolor or delete the tags on your expenses. New tags are made when adding an expense.
      </p>

      <p
        v-if="appData.isOffline.value"
        class="mx-auto mt-4 max-w-xl rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-600 dark:bg-gray-800 dark:text-gray-300"
        role="status"
      >
        You're offline. Changing tags needs a connection.
      </p>

      <div class="mx-auto mt-4 max-w-xl">
        <UInput
          v-model="search"
          class="w-full"
          icon="heroicons-solid:magnifying-glass"
          placeholder="Search tags"
          aria-label="Search tags"
        />

        <p v-if="loading" class="mt-6 text-center text-sm text-gray-500">Loading…</p>
        <div v-else-if="loadError" class="mt-6 text-center text-sm">
          <p class="text-red-600 dark:text-red-400">{{ loadError }}</p>
          <UButton class="mt-2" color="neutral" variant="outline" label="Try again" @click="load" />
        </div>
        <p v-else-if="!tags.length" class="mt-6 text-center text-sm text-gray-500">
          No tags yet. Create one while adding an expense.
        </p>
        <p v-else-if="!visibleTags.length" class="mt-6 text-center text-sm text-gray-500">
          No tags match "{{ search }}".
        </p>

        <ul
          v-else
          class="mt-4 divide-y divide-gray-200 overflow-hidden rounded-xl border border-gray-200 bg-white dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900"
        >
          <li v-for="tag in visibleTags" :key="tag.id" class="flex items-center gap-3 px-4 py-3">
            <span class="min-w-0 flex-1">
              <TagChip :name="tag.name" :color="tag.color" />
              <span v-if="!appData.isOffline.value" class="mt-1 block text-sm text-gray-500 dark:text-gray-400">
                {{ describeUse(tag.expenseCount) }}
              </span>
            </span>
            <UButton
              icon="heroicons-solid:pencil-square"
              color="neutral"
              variant="ghost"
              size="sm"
              :aria-label="`Edit ${tag.name}`"
              :disabled="appData.isOffline.value || preparing"
              @click="openEdit(tag)"
            />
          </li>
        </ul>
      </div>
    </UContainer>

    <UModal v-model:open="isEditOpen">
      <template #content>
        <div v-if="editing" class="space-y-4 p-6">
          <h3 class="text-xl font-bold">{{ step === 'edit' ? 'Edit tag' : 'Delete tag' }}</h3>

          <template v-if="step === 'edit'">
            <p
              v-if="blockedMessage"
              class="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
              role="alert"
            >
              {{ blockedMessage }}
            </p>

            <UFormField label="Name">
              <UInput v-model="nameInput" size="xl" class="w-full" :disabled="!!blockedMessage" @keydown.enter="save" />
            </UFormField>
            <p v-if="nameError" class="text-sm text-red-600 dark:text-red-400">{{ nameError }}</p>

            <div>
              <p class="mb-2 text-sm font-medium">Color</p>
              <div class="flex flex-wrap gap-2" role="radiogroup" aria-label="Tag color">
                <button
                  v-for="color in TAG_COLORS"
                  :key="color"
                  type="button"
                  role="radio"
                  :aria-checked="colorInput === color"
                  :aria-label="color"
                  :disabled="!!blockedMessage"
                  class="size-8 cursor-pointer rounded-full border-2 transition-transform"
                  :class="colorInput === color ? 'scale-110 border-gray-900 dark:border-white' : 'border-transparent'"
                  :style="{ backgroundColor: color }"
                  @click="colorInput = color"
                />
              </div>
            </div>

            <p class="text-sm text-gray-500 dark:text-gray-400">Used on {{ describeUse(editing.expenseCount) }}.</p>
            <p v-if="actionError" class="text-sm text-red-600 dark:text-red-400" role="alert">{{ actionError }}</p>

            <div class="flex items-center justify-between gap-2">
              <UButton
                color="error"
                variant="ghost"
                label="Delete…"
                :disabled="saving || !!blockedMessage"
                @click="step = 'delete'"
              />
              <div class="flex gap-2">
                <UButton color="neutral" variant="ghost" label="Cancel" @click="isEditOpen = false" />
                <UButton label="Save" :loading="saving" :disabled="!canSave || saving" @click="save" />
              </div>
            </div>
          </template>

          <template v-else>
            <p class="text-sm text-gray-700 dark:text-gray-200">
              Delete {{ editing.name }}? It will be removed from {{ describeUse(editing.expenseCount) }}. The expenses
              themselves are kept. This cannot be undone.
            </p>
            <p v-if="actionError" class="text-sm text-red-600 dark:text-red-400" role="alert">{{ actionError }}</p>
            <div class="flex justify-end gap-2">
              <UButton color="neutral" variant="ghost" label="Back" :disabled="saving" @click="step = 'edit'" />
              <UButton color="error" label="Delete" :loading="saving" :disabled="saving" @click="confirmDelete" />
            </div>
          </template>
        </div>
      </template>
    </UModal>
  </div>
</template>
