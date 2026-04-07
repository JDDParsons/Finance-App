<script setup lang="ts">
import { useAccountsStore } from './stores/accounts'

const accountsStore = useAccountsStore()
const route = useRoute()

const isAuthenticated = computed(() => route.path !== '/')

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
    <BottomNav v-if="isAuthenticated" class="lg:hidden" />
    <SuccessOverlay />
  </UApp>
</template>
