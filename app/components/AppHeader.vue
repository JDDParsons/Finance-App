<script setup lang="ts">
import { useProfileStore } from '~/stores/profile'
import { storeToRefs } from 'pinia'

const props = withDefaults(defineProps<{
  title?: string
  showProfile?: boolean
}>(), {
  showProfile: true,
})

const profileStore = useProfileStore()
const { profile } = storeToRefs(profileStore)

const syncStatus = useSyncStatus()
// A ring that ripples out from the blue dot while the app is syncing.
const syncingDotClass = 'motion-safe:animate-pulse motion-safe:after:absolute motion-safe:after:inset-0 motion-safe:after:rounded-full motion-safe:after:bg-info motion-safe:after:animate-ping'

const profileInitial = computed(() => {
  return profile.value?.first_name?.charAt(0)?.toUpperCase() || '?'
})
</script>

<template>
  <UHeader
    :toggle="false"
    class="lg:-ml-56 lg:w-[calc(100%+14rem)]"
    :ui="{ container: 'max-w-none lg:pl-6', left: 'min-w-0', right: 'shrink-0' }"
  >
    <template #left>
      <HomeGreeting :first-name="profile?.first_name" />
    </template>
    <template #right>
      <div class="flex items-center gap-2">
        <slot name="actions" />
        <UChip
          v-if="showProfile"
          :color="syncStatus.color"
          size="2xl"
          position="bottom-left"
          inset
          :ui="{ base: syncStatus.state === 'syncing' ? syncingDotClass : '' }"
        >
          <NuxtLink
            to="/profile"
            class="inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-full ring-1 ring-gray-200 transition-opacity hover:opacity-90 dark:ring-gray-700"
            :aria-label="`Open profile. ${syncStatus.label}`"
            :title="syncStatus.label"
          >
            <img
              v-if="profile?.avatar_link"
              :src="profile.avatar_link"
              alt="Profile"
              class="h-full w-full object-cover"
            />
            <span
              v-else
              class="inline-flex h-full w-full items-center justify-center bg-primary-100 text-sm font-bold text-primary-700 dark:bg-primary-900 dark:text-primary-300"
            >
              {{ profileInitial }}
            </span>
          </NuxtLink>
        </UChip>
      </div>
    </template>
  </UHeader>
</template>
