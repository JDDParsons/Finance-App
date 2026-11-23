<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useProfileStore } from '~/stores/profile'
import { useSignOut } from '~/composables/useSignOut'

useHead({ title: 'Profile | Budgify' })

const { handleSignOut } = useSignOut()
const router = useRouter()

// --- Sync status ---
const appData = useAppData()
const syncStatus = useSyncStatus()

async function discardFailedChanges() {
  if (!window.confirm('Discard all failed offline changes? This cannot be undone.')) return
  await appData.discardFailed()
}

// --- Profile ---
const profileStore = useProfileStore()
const { profile } = storeToRefs(profileStore)

const displayName = computed(() => {
  if (!profile.value) return 'User'
  const parts = [profile.value.first_name, profile.value.last_name].filter(Boolean)
  return parts.length ? parts.join(' ') : profile.value.email || 'User'
})

const profileInitial = computed(() => {
  return profile.value?.first_name?.charAt(0)?.toUpperCase() || '?'
})

function goBack() {
  if (import.meta.client && window.history.length > 1) router.back()
  else router.push('/')
}
</script>

<template>
  <div>
    <AppHeader title="Profile" />

    <UContainer class="py-6">
      <div class="mb-4 flex items-center justify-between">
        <UButton icon="heroicons-solid:arrow-left" color="neutral" variant="ghost" aria-label="Go back" @click="goBack" />
        <div class="flex items-center gap-2">
          <UButton to="/settings" color="neutral" variant="ghost" size="sm" icon="heroicons-solid:cog-6-tooth" aria-label="Settings" />
          <UButton color="neutral" variant="ghost" size="sm" icon="heroicons-solid:arrow-right-on-rectangle" aria-label="Sign out" @click="handleSignOut" />
        </div>
      </div>

      <div class="flex flex-col items-center pt-8 pb-6 mb-2">
        <!-- Profile image or initial -->
        <div class="w-58 h-58 rounded-full mb-3 ring-4 ring-white dark:ring-gray-800 shadow-lg overflow-hidden flex items-center justify-center bg-primary-100 dark:bg-primary-900">
          <img
            v-if="profile?.avatar_link"
            :src="profile.avatar_link"
            alt="Profile"
            class="w-full h-full object-cover"
          />
          <span v-else class="text-9xl font-bold text-primary-600 dark:text-primary-300 select-none">
            {{ profileInitial }}
          </span>
        </div>
        <!-- Name -->
        <p class="text-xl font-semibold text-gray-900 dark:text-white">
          {{ displayName }}
        </p>
        <!-- Email -->
        <p v-if="profile?.email" class="text-sm text-gray-400 mt-0.5">{{ profile.email }}</p>
        <!-- Sync status -->
        <div class="mt-2 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm" role="status">
          <UIcon
            :name="syncStatus.icon"
            class="size-4"
            :class="[
              syncStatus.state === 'offline' ? 'text-gray-400' : '',
              syncStatus.state === 'syncing' ? 'text-sky-500' : '',
              syncStatus.state === 'synced' ? 'text-green-500' : '',
              syncStatus.state === 'attention' ? 'text-amber-500' : '',
              syncStatus.spin ? 'motion-safe:animate-spin' : '',
            ]"
          />
          <span class="text-gray-500 dark:text-gray-400">{{ syncStatus.label }}</span>
          <template v-if="syncStatus.state === 'attention'">
            <button class="underline" :disabled="appData.syncing.value" @click="appData.retryFailed()">Retry</button>
            <button class="underline" :disabled="appData.syncing.value" @click="discardFailedChanges">Discard</button>
          </template>
        </div>
      </div>
    </UContainer>
  </div>
</template>
