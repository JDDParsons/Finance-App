<script setup lang="ts">
import { useFinanceStore } from './stores/finance'

const store = useFinanceStore()
onMounted(() => { store.fetchAll() })
</script>

<template>
  <UApp class="overflow-x-hidden">
    <NuxtPage />
    <BottomNav />
  </UApp>
</template>
