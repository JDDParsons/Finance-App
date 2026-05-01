<script setup lang="ts">
import { useAccountsStore } from './stores/accounts'

const accountsStore = useAccountsStore()
const route = useRoute()

const isAuthenticated = computed(() => route.path !== '/')
const showMonthShortcut = computed(() => false)
const showProfileShortcut = computed(() => false)

onMounted(() => {
  accountsStore.ensureLoaded()
})
</script>

<template>
  <UApp class="overflow-x-hidden">
    <SideNav v-if="isAuthenticated" class="hidden lg:flex" />
    <div :class="isAuthenticated ? 'lg:pl-56' : ''">
      <NuxtPage />
    </div>
    <div
      v-if="showMonthShortcut"
      class="fixed left-4 z-40 lg:left-auto lg:right-20"
      style="top: calc(env(safe-area-inset-top, 0px) + 1rem);"
    >
      <MonthSelector icon-only />
    </div>
    <NuxtLink
      v-if="showProfileShortcut"
      to="/accounts"
      class="fixed right-4 z-40 inline-flex items-center justify-center rounded-full border border-gray-200 bg-white/90 p-3 text-gray-600 shadow-lg shadow-black/10 backdrop-blur transition-colors hover:text-primary-500 dark:border-gray-700 dark:bg-gray-900/90 dark:text-gray-300 dark:hover:text-primary-400"
      style="top: calc(env(safe-area-inset-top, 0px) + 1rem);"
      aria-label="Open profile"
    >
      <UIcon name="heroicons-solid:user-circle" class="size-6" />
    </NuxtLink>
    <BottomNav v-if="isAuthenticated" class="lg:hidden" />
    <SuccessOverlay />
  </UApp>
</template>
