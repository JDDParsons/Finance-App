<script setup lang="ts">
import { formatLongDate, greetingFor, isDaytime } from '../../../utils/greeting'

defineProps<{ firstName?: string | null }>()

const now = ref(new Date())
const refresh = () => { now.value = new Date() }
let timer: ReturnType<typeof setInterval> | undefined

// The app can stay open for hours. Timers pause in the background, so also
// refresh as soon as it is visible again.
onMounted(() => {
  timer = setInterval(refresh, 60_000)
  document.addEventListener('visibilitychange', refresh)
})

onUnmounted(() => {
  clearInterval(timer)
  document.removeEventListener('visibilitychange', refresh)
})
</script>

<template>
  <div class="flex min-w-0 items-center gap-2.5">
    <UIcon
      :name="isDaytime(now) ? 'heroicons:sun' : 'heroicons:moon'"
      class="size-8 shrink-0"
      :class="isDaytime(now) ? 'text-amber-500' : 'text-indigo-400'"
      aria-hidden="true"
    />
    <div class="min-w-0">
      <p class="truncate text-base font-semibold leading-tight sm:text-lg">
        {{ greetingFor(now) }}<template v-if="firstName">, <span class="text-green-500">{{ firstName }}</span></template>
      </p>
      <p class="truncate text-xs text-muted">{{ formatLongDate(now) }}</p>
    </div>
  </div>
</template>
