<script setup lang="ts">
const props = defineProps<{
    value: number
    max: number
}>()

const spentPercentage = computed(() => {
    if (props.max <= 0) return 0
    return Math.max((props.value / props.max) * 100, 0)
})

const barWidth = computed(() => {
    if (spentPercentage.value > 200) return Math.min(spentPercentage.value - 200, 100)
    if (spentPercentage.value > 100) return spentPercentage.value - 100
    return Math.min(spentPercentage.value, 100)
})

const barColor = computed(() => {
    if (spentPercentage.value > 200) return '#ef4444'
    if (spentPercentage.value > 100) return '#eab308'
    return '#22c55e'
})

const trackStyle = computed(() => {
    if (spentPercentage.value > 200) return { backgroundColor: '#eab308' }
    if (spentPercentage.value > 100) return { backgroundColor: '#22c55e' }
    return {}
})

const fillStyle = computed(() => ({
    width: `${barWidth.value}%`,
    backgroundColor: barColor.value
}))
</script>

<template>
    <div
        class="mt-1 w-full h-2 rounded-full overflow-visible bg-white dark:bg-gray-700"
        :style="trackStyle"
    >
        <div
            v-if="barWidth > 0"
            class="h-full rounded-full transition-all duration-500"
            :style="fillStyle"
        />
    </div>
</template>
