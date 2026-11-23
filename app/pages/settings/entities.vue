<script setup lang="ts">
import { useEntitiesApi } from '~/composables/api/useEntitiesApi'
import { getOfflineSnapshotsForUser } from '~/utils/offlineFinanceCache.client'
import {
  confirmationMessage,
  describeRecords,
  entityRecordCount,
  entityTotal,
  filterEntities,
  planRename,
  sortEntities,
  summarizeEntities,
  type EntitySort,
  type EntitySummary,
} from '../../../utils/entities'

useHead({ title: 'Payment entities | Budgify' })

const router = useRouter()
const appData = useAppData()
const { listEntities, renameEntity } = useEntitiesApi()

function goBack() {
  if (import.meta.client && window.history.length > 1) router.back()
  else router.push('/settings')
}

// --- List ---
const entities = ref<EntitySummary[]>([])
const loading = ref(true)
const loadError = ref<string | null>(null)
// 'cache' means the list was built from the months saved on this device.
const source = ref<'server' | 'cache'>('server')
const search = ref('')
const sort = ref<EntitySort>('name')

const sortOptions = [
  { label: 'Name', value: 'name' },
  { label: 'Most records', value: 'count' },
  { label: 'Highest total', value: 'total' },
]

const visibleEntities = computed(() => sortEntities(filterEntities(entities.value, search.value), sort.value))

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value)
}

async function loadFromCache() {
  const userId = useState<string | null>('app-data-user-id').value
  const snapshots = userId ? await getOfflineSnapshotsForUser(userId) : []
  entities.value = summarizeEntities(
    snapshots.flatMap(snapshot => snapshot.finance.budgetHits ?? []),
    snapshots.flatMap(snapshot => snapshot.finance.income ?? [])
  )
  source.value = 'cache'
}

async function load() {
  loading.value = true
  loadError.value = null
  try {
    if (appData.isOffline.value) {
      await loadFromCache()
    } else {
      try {
        entities.value = await listEntities()
        source.value = 'server'
      } catch {
        // A connection problem falls back to the saved months; anything else is shown.
        if (!navigator.onLine) await loadFromCache()
        else throw new Error('Could not load your payment entities.')
      }
    }
  } catch (error: any) {
    loadError.value = error?.message || 'Could not load your payment entities.'
  } finally {
    loading.value = false
  }
}

onMounted(load)
// Reload when the connection comes back so the full list replaces the saved months.
watch(() => appData.isOffline.value, () => { void load() })

// --- Edit, rename and merge ---
const isEditOpen = ref(false)
const editing = ref<EntitySummary | null>(null)
const nameInput = ref('')
const step = ref<'edit' | 'confirm'>('edit')
const saving = ref(false)
const actionError = ref<string | null>(null)
const preparing = ref(false)
const blockedMessage = ref<string | null>(null)

const plan = computed(() => editing.value ? planRename(entities.value, editing.value, nameInput.value) : null)
const canContinue = computed(() => plan.value?.kind === 'rename' || plan.value?.kind === 'merge')
const confirmText = computed(() => {
  const current = plan.value
  if (!editing.value || !current || (current.kind !== 'rename' && current.kind !== 'merge')) return ''
  return confirmationMessage(editing.value, current)
})

function waitingChanges() {
  return appData.pendingSyncCount.value + appData.failedSyncCount.value
}

// A queued entry that is retried after a rename would bring the old name back, so
// anything still waiting on this device is synced or resolved first.
async function ensureQueueEmpty() {
  if (waitingChanges() && !appData.failedSyncCount.value) await appData.syncOutbox()
  const waiting = waitingChanges()
  if (!waiting) return null
  const failed = appData.failedSyncCount.value
  return failed
    ? `${failed} change${failed === 1 ? '' : 's'} could not sync. Retry or discard ${failed === 1 ? 'it' : 'them'} on your profile page before renaming.`
    : `${waiting} change${waiting === 1 ? ' is' : 's are'} still waiting to sync. Try again once they have synced.`
}

async function openEdit(entity: EntitySummary) {
  if (appData.isOffline.value || source.value === 'cache') return
  actionError.value = null
  preparing.value = true
  try {
    blockedMessage.value = await ensureQueueEmpty()
  } finally {
    preparing.value = false
  }
  editing.value = entity
  nameInput.value = entity.name
  step.value = 'edit'
  isEditOpen.value = true
}

function closeEdit() {
  isEditOpen.value = false
}

function backToEdit() {
  step.value = 'edit'
}

function goToConfirm() {
  if (!canContinue.value) return
  actionError.value = null
  step.value = 'confirm'
}

async function save() {
  const entity = editing.value
  const current = plan.value
  if (!entity || !current || (current.kind !== 'rename' && current.kind !== 'merge')) return
  saving.value = true
  actionError.value = null
  try {
    await renameEntity(entity.key, current.name)
    isEditOpen.value = false
    // Reload the open month, then the saved recent months, so the new name shows everywhere.
    await load()
    await appData.refresh()
    void appData.precacheRecentMonths(true)
  } catch (error: any) {
    actionError.value = error?.data?.statusMessage || error?.statusMessage || error?.message || 'Could not rename. Try again.'
    step.value = 'edit'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div>
    <AppHeader title="Payment entities" />

    <UContainer class="py-6">
      <div class="mb-4 flex items-center justify-between">
        <UButton icon="heroicons-solid:arrow-left" color="neutral" variant="ghost" aria-label="Go back" @click="goBack" />
      </div>

      <h1 class="text-center text-2xl font-bold">Payment entities</h1>
      <p class="mt-1 text-center text-sm text-gray-500 dark:text-gray-400">
        The payers and payees on your expenses and income. Renaming changes every matching record.
      </p>

      <p
        v-if="source === 'cache'"
        class="mx-auto mt-4 max-w-xl rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-600 dark:bg-gray-800 dark:text-gray-300"
        role="status"
      >
        You're offline. This list only covers the months saved on this device, and renaming needs a connection.
      </p>

      <div class="mx-auto mt-4 max-w-xl">
        <div class="flex items-center gap-2">
          <UInput
            v-model="search"
            class="flex-1"
            icon="heroicons-solid:magnifying-glass"
            placeholder="Search entities"
            aria-label="Search entities"
          />
          <USelect v-model="sort" :items="sortOptions" class="w-40" aria-label="Sort entities" />
        </div>

        <p v-if="loading" class="mt-6 text-center text-sm text-gray-500">Loading…</p>
        <div v-else-if="loadError" class="mt-6 text-center text-sm">
          <p class="text-red-600 dark:text-red-400">{{ loadError }}</p>
          <UButton class="mt-2" color="neutral" variant="outline" label="Try again" @click="load" />
        </div>
        <p v-else-if="!entities.length" class="mt-6 text-center text-sm text-gray-500">
          No payment entities yet. They appear here once you add expenses or income.
        </p>
        <p v-else-if="!visibleEntities.length" class="mt-6 text-center text-sm text-gray-500">
          No entities match "{{ search }}".
        </p>

        <ul
          v-else
          class="mt-4 divide-y divide-gray-200 overflow-hidden rounded-xl border border-gray-200 bg-white dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900"
        >
          <li v-for="entity in visibleEntities" :key="entity.key" class="flex items-center gap-3 px-4 py-3">
            <span class="min-w-0 flex-1">
              <span class="block truncate font-medium text-gray-900 dark:text-white">{{ entity.name }}</span>
              <span class="block text-sm text-gray-500 dark:text-gray-400">
                {{ describeRecords(entity.expenseCount, entity.incomeCount) }} · {{ formatCurrency(entityTotal(entity)) }}
              </span>
            </span>
            <UButton
              icon="heroicons-solid:pencil-square"
              color="neutral"
              variant="ghost"
              size="sm"
              :aria-label="`Edit ${entity.name}`"
              :disabled="source === 'cache' || appData.isOffline.value || preparing"
              @click="openEdit(entity)"
            />
          </li>
        </ul>
      </div>
    </UContainer>

    <UModal v-model:open="isEditOpen">
      <template #content>
        <div v-if="editing" class="space-y-4 p-6">
          <h3 class="text-xl font-bold">{{ step === 'edit' ? 'Edit entity' : 'Confirm' }}</h3>

          <template v-if="step === 'edit'">
            <p
              v-if="blockedMessage"
              class="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
              role="alert"
            >
              {{ blockedMessage }}
            </p>

            <UFormField label="Name">
              <UInput v-model="nameInput" size="xl" class="w-full" :disabled="!!blockedMessage" @keydown.enter="goToConfirm" />
            </UFormField>

            <p v-if="plan?.kind === 'invalid'" class="text-sm text-red-600 dark:text-red-400">{{ plan.message }}</p>
            <p v-else-if="plan?.kind === 'merge'" class="text-sm text-gray-600 dark:text-gray-300">
              "{{ plan.into.name }}" already exists, so this merges the two. They already have
              {{ describeRecords(plan.into.expenseCount, plan.into.incomeCount) }}.
            </p>
            <p v-else class="text-sm text-gray-500 dark:text-gray-400">
              Used on {{ describeRecords(editing.expenseCount, editing.incomeCount) }}. Typing the name of another entity merges them.
            </p>

            <p v-if="actionError" class="text-sm text-red-600 dark:text-red-400" role="alert">{{ actionError }}</p>

            <div class="flex justify-end gap-2">
              <UButton color="neutral" variant="ghost" label="Cancel" @click="closeEdit" />
              <UButton
                :label="plan?.kind === 'merge' ? 'Merge…' : 'Rename…'"
                :disabled="!canContinue || !!blockedMessage"
                @click="goToConfirm"
              />
            </div>
          </template>

          <template v-else>
            <p class="text-sm text-gray-700 dark:text-gray-200">{{ confirmText }}</p>
            <p v-if="actionError" class="text-sm text-red-600 dark:text-red-400" role="alert">{{ actionError }}</p>
            <div class="flex justify-end gap-2">
              <UButton color="neutral" variant="ghost" label="Back" :disabled="saving" @click="backToEdit" />
              <UButton
                :label="plan?.kind === 'merge' ? 'Merge' : 'Rename'"
                :loading="saving"
                :disabled="saving"
                @click="save"
              />
            </div>
          </template>
        </div>
      </template>
    </UModal>
  </div>
</template>
