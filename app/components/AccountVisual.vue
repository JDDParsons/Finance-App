<script setup lang="ts">
import { resolveAccountIcon } from '../../utils/accountAppearance'

const props = withDefaults(defineProps<{
  account?: { color?: string | null; icon?: string | null } | null
  size?: 'sm' | 'md' | 'lg'
  fallbackClass?: string
}>(), { size: 'md', fallbackClass: 'bg-primary-50 dark:bg-primary-950/50' })

const color = computed(() => props.account?.color ?? null)
const wrapperClass = computed(() => ({ sm: 'size-5', md: 'size-10', lg: 'size-12' }[props.size]))
const iconClass = computed(() => ({ sm: 'size-3', md: 'size-5', lg: 'size-6' }[props.size]))
const style = computed(() => color.value ? {
  backgroundColor: `${color.value}1f`,
  borderColor: `${color.value}55`,
  color: color.value,
} : {})
</script>

<template>
  <span
    :class="[wrapperClass, 'inline-flex shrink-0 items-center justify-center rounded-full border border-transparent', !color && fallbackClass]"
    :style="style"
  >
    <UIcon :name="resolveAccountIcon(account?.icon)" :class="iconClass" />
  </span>
</template>
