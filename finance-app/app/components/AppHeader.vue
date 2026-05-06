<script setup lang="ts">
import { useSelectedMonthTitle } from '~/composables/useSelectedMonthTitle'
import { useProfileStore } from '~/stores/profile'
import { storeToRefs } from 'pinia'

const props = withDefaults(defineProps<{
  title?: string
  showMonth?: boolean
  showMonthSelector?: boolean
  showProfile?: boolean
}>(), {
  showMonth: true,
  showMonthSelector: true,
  showProfile: true,
})

const { monthTitle } = useSelectedMonthTitle()
const profileStore = useProfileStore()
const { profile } = storeToRefs(profileStore)

const profileInitial = computed(() => {
  return profile.value?.first_name?.charAt(0)?.toUpperCase() || '?'
})
</script>

<template>
  <UHeader :toggle="false">
    <template #left>
      <div class="flex items-center gap-2.5">
        <img src="/Budgify.png" alt="" class="h-14 w-14 rounded-lg shrink-0" />
        <div>
          <p
            v-if="showMonth"
            class="text-4xl text-neutral font-extrabold leading-none tracking-tight sm:text-4xl"
          >
            {{ monthTitle }}
          </p>
        </div>
      </div>
    </template>
    <template #right>
      <div class="flex items-center gap-2">
        <slot name="actions" />
        <MonthSelector v-if="showMonth && showMonthSelector" plain />
        <NuxtLink
          v-if="showProfile"
          to="/profile"
          class="inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-full ring-1 ring-gray-200 transition-opacity hover:opacity-90 dark:ring-gray-700"
          aria-label="Open profile"
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
      </div>
    </template>
  </UHeader>
</template>
