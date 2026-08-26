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

const gradient = computed(() => {
    if (spentPercentage.value > 200) return 'linear-gradient(to right, #f97316, #ef4444)'
    if (spentPercentage.value > 100) return 'linear-gradient(to right, #eab308, #f97316)'
    return 'linear-gradient(to right, #22c55e, #eab308)'
})

const trackStyle = computed(() => {
    if (spentPercentage.value > 200) {
        return { backgroundImage: 'linear-gradient(to right, #eab308, #f97316)' }
    }
    if (spentPercentage.value > 100) {
        return { backgroundImage: 'linear-gradient(to right, #22c55e, #eab308)' }
    }
    return {}
})

const fillStyle = computed(() => ({
    width: `${barWidth.value}%`,
    backgroundImage: gradient.value,
    backgroundSize: barWidth.value > 0 ? `${10000 / barWidth.value}% 100%` : '100% 100%',
    boxShadow: '0 0 3px 0.3px rgb(34 197 94 / 45%)'
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
