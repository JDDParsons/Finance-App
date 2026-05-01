<script setup lang="ts">
import { useSelectedMonthTitle } from '~/composables/useSelectedMonthTitle'

const props = withDefaults(defineProps<{
  title: string
  showMonth?: boolean
  showProfile?: boolean
}>(), {
  showMonth: true,
  showProfile: true,
})

const { monthTitle } = useSelectedMonthTitle()
</script>

<template>
  <UHeader :toggle="false">
    <template #left>
      <div class="mt-1">
        <p v-if="showMonth" class="text-sm font-semibold text-primary uppercase tracking-wide">{{ monthTitle }}</p>
        <h1 class="text-xl font-bold text-highlighted">{{ title }}</h1>
      </div>
    </template>
    <template #right>
      <div class="flex items-center gap-2">
        <slot name="actions" />
        <MonthSelector v-if="showMonth" plain />
        <UButton
          v-if="showProfile"
          to="/accounts"
          color="neutral"
          variant="ghost"
          size="xl"
          icon="heroicons-solid:user-circle"
          aria-label="Open profile"
        />
      </div>
    </template>
  </UHeader>
</template>
