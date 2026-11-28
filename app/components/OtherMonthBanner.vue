<script setup lang="ts">
import { useFinanceStore } from '~/stores/finance'
import { otherMonthNotice } from '../../utils/monthNavigation'

const store = useFinanceStore()
const appData = useAppData()
const loading = ref(false)
const failed = ref(false)

// The app can stay open into a new month, so "now" is read again on return.
const now = ref(new Date())
const refresh = () => { now.value = new Date() }
let timer: ReturnType<typeof setInterval> | undefined

onMounted(() => {
  timer = setInterval(refresh, 60_000)
  document.addEventListener('visibilitychange', refresh)
})

onUnmounted(() => {
  clearInterval(timer)
  document.removeEventListener('visibilitychange', refresh)
})

const notice = computed(() => otherMonthNotice(store.selectedMonth, now.value))

// A failure belongs to the month it happened on.
watch(() => store.selectedMonth, () => { failed.value = false })

async function returnToCurrentMonth() {
  if (!notice.value || loading.value) return
  const { year, month } = notice.value.current
  loading.value = true
  failed.value = false
  try {
    await appData.selectMonth(year, month)
  } catch {
    failed.value = true
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <!-- data-month-banner moves the sync notice below this (see main.css) -->
  <button
    v-if="notice"
    type="button"
    data-month-banner
    class="flex min-h-8 w-full cursor-pointer items-center justify-center gap-1.5 bg-yellow-300 px-3 py-1 text-center text-xs font-medium text-yellow-950 transition-colors active:bg-yellow-400"
    :disabled="loading"
    @click="returnToCurrentMonth"
  >
    <UIcon name="heroicons:exclamation-triangle-solid" class="size-4 shrink-0" aria-hidden="true" />
    <span role="status">
      {{ notice.message }} ·
      <span class="font-bold underline">
        {{ failed ? "Couldn't load. Tap to retry" : loading ? 'Loading…' : notice.action }}
      </span>
    </span>
  </button>
</template>
