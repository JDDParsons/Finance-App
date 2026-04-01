<script setup lang="ts">
import { useFinanceStore } from './stores/finance'
import { useAccountsStore } from './stores/accounts'

const store = useFinanceStore()
const accountsStore = useAccountsStore()

onMounted(() => {
  store.fetchAll()
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
