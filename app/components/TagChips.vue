<script setup lang="ts">
import { useFinanceStore } from '~/stores/finance'

// The tags of an expense as chips, in the colors the household's tags have.
defineProps<{ names: string[] }>()

const store = useFinanceStore()
</script>

<template>
  <span class="flex flex-wrap gap-1">
    <TagChip v-for="name in names" :key="name" :name="name" :color="store.tagsByName.get(name)?.color" />
  </span>
</template>
