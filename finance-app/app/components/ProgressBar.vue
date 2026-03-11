<script setup lang="ts">
const props = defineProps<{
    value: number
    max: number
    colour: string
}>()

const percentage = computed(() => Math.min((props.value / props.max) * 100, 100))
</script>

<template>
    <div class="mt-1 w-full h-2 rounded-full overflow-visible bg-gray-200 dark:bg-gray-700">
        <div
            v-if="percentage > 0"
            class="h-full rounded-full transition-all duration-500"
            :style="{
                width: `${percentage}%`,
                backgroundColor: colour,
                boxShadow: `0 0px 1px 0.1px ${colour}`
            }"
        />
    </div>
</template>
