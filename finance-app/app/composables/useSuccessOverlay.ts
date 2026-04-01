import { ref } from 'vue'

// Module-level state so a single overlay instance is shared across all components
const visible = ref(false)
let timer: ReturnType<typeof setTimeout> | null = null

export function useSuccessOverlay() {
  function show(duration = 1800) {
    if (timer) clearTimeout(timer)
    visible.value = true
    timer = setTimeout(() => {
      visible.value = false
      timer = null
    }, duration)
  }

  return { visible, show }
}
