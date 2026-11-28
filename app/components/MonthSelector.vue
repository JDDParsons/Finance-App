<script setup lang="ts">
import { useFinanceStore } from '~/stores/finance'
import { adjacentMonth, monthPickerLabel, type Month } from '../../utils/monthNavigation'

const store = useFinanceStore()
const appData = useAppData()
const selectionError = ref<string | null>(null)

// A month being loaded. It is shown at once, so that tapping again moves on from
// it. Shallow, so that the object can be compared with the one asked for.
const pending = shallowRef<Month | null>(null)
const shown = computed(() => pending.value ?? store.selectedMonth)

const previous = computed(() => adjacentMonth(store.availableMonths, shown.value, -1))
const next = computed(() => adjacentMonth(store.availableMonths, shown.value, 1))

async function select(target: Month | null) {
  if (!target) return
  selectionError.value = null
  pending.value = target
  try {
    await appData.selectMonth(target.year, target.month)
  } catch (error: any) {
    if (pending.value === target) selectionError.value = error?.message || 'Could not load that month.'
  } finally {
    if (pending.value === target) pending.value = null
  }
}
</script>

<template>
  <div class="flex flex-col items-center">
    <div class="inline-flex items-center gap-1">
      <UButton
        color="neutral"
        variant="ghost"
        size="sm"
        square
        :disabled="!previous"
        class="disabled:opacity-30"
        aria-label="Previous month"
        @click="select(previous)"
      >
        <UIcon name="heroicons:chevron-left" class="size-5" />
      </UButton>
      <span
        class="min-w-36 text-center text-lg font-bold whitespace-nowrap text-highlighted"
        :class="{ 'motion-safe:animate-pulse': pending }"
        aria-live="polite"
      >
        {{ monthPickerLabel(shown) }}
      </span>
      <UButton
        color="neutral"
        variant="ghost"
        size="sm"
        square
        :disabled="!next"
        class="disabled:opacity-30"
        aria-label="Next month"
        @click="select(next)"
      >
        <UIcon name="heroicons:chevron-right" class="size-5" />
      </UButton>
    </div>
    <p v-if="selectionError" class="text-center text-xs text-red-600 dark:text-red-400" role="alert">
      {{ selectionError }}
    </p>
  </div>
</template>
