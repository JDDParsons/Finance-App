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
    <NuxtPage />
    <BottomNav />
  </UApp>
</template>
