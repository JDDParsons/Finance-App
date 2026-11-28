<script setup lang="ts">
import { countUpValue, describeRemaining, formatWholeDollars } from '../../../utils/remainingFunds'

const COUNT_UP_MS = 1100

const props = defineProps<{
  income: number
  expenses: number
  monthName: string
  loading?: boolean
}>()

const remaining = computed(() => describeRemaining(props))

// The figure on screen, which counts towards the real amount when it changes.
const shownAmount = ref(0)
let frame: number | undefined

function stopCounting() {
  if (frame !== undefined) cancelAnimationFrame(frame)
  frame = undefined
}

function countTo(target: number) {
  stopCounting()
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    shownAmount.value = target
    return
  }

  const from = shownAmount.value
  let startedAt: number | undefined
  const step = (now: number) => {
    startedAt ??= now
    const progress = (now - startedAt) / COUNT_UP_MS
    shownAmount.value = countUpValue(from, target, progress)
    frame = progress < 1 ? requestAnimationFrame(step) : undefined
  }
  frame = requestAnimationFrame(step)
}

onMounted(() => {
  watch(
    () => (props.loading ? null : remaining.value.amount),
    (amount) => { if (amount !== null) countTo(amount) },
    { immediate: true },
  )
})

onUnmounted(stopCounting)
</script>

<template>
  <div
    class="relative isolate overflow-hidden rounded-2xl bg-linear-to-br p-5 text-white shadow-lg transition-colors"
    :class="!loading && remaining.isOverspent
      ? 'from-amber-500 to-orange-600 shadow-orange-600/25'
      : 'from-green-500 to-emerald-700 shadow-emerald-600/25'"
  >
    <!-- A soft light behind the tree. A gradient over the whole card, because iOS
         can cut a blur filter off in a visible rectangle. -->
    <div class="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_85%_5%,rgb(255_255_255/0.18),transparent_55%)]" />
    <!-- Small enough to stay out from behind the white text, which it would hide -->
    <HomeMoneyTree class="pointer-events-none absolute bottom-0 right-2 -z-10 h-28 text-white max-[359px]:h-20" />

    <!-- Kept clear of the tree on the right -->
    <div class="flex min-h-24 flex-col justify-center pr-28">
      <p class="text-sm font-semibold text-white/90">{{ remaining.label }}</p>
      <USkeleton v-if="loading" class="mt-2 h-10 w-36 bg-white/30" />
      <p v-else class="text-4xl font-extrabold tracking-tight tabular-nums drop-shadow-md sm:text-5xl">
        <span aria-hidden="true">{{ formatWholeDollars(shownAmount) }}</span>
        <span class="sr-only">{{ formatWholeDollars(remaining.amount) }}</span>
      </p>
    </div>
  </div>
</template>
