<script setup lang="ts">
import { useAccountsStore } from './stores/accounts'

const accountsStore = useAccountsStore()

onMounted(() => {
  accountsStore.ensureLoaded()
})
</script>

<template>
  <UApp class="overflow-x-hidden">
    <SideNav class="hidden lg:flex" />
    <div class="lg:pl-56">
      <NuxtPage />
    </div>
    <BottomNav class="lg:hidden" />
    <SuccessOverlay />
  </UApp>
</template>
