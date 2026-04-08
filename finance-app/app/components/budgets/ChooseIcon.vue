<script setup lang="ts">
const props = defineProps<{
    modelValue: string | null
    color?: string | null
}>()

const emit = defineEmits<{
    'update:modelValue': [value: string | null]
}>()

const icons = [
    { icon: 'heroicons:home-solid', label: 'House' },
    { icon: 'heroicons:shopping-cart-solid', label: 'Shopping cart' },
    { icon: 'streamline-plump:fork-knife-solid', label: 'Fork & knife' },
    { icon: 'streamline-ultimate:car-3-bold', label: 'Car' },
    { icon: 'ic:baseline-phone-iphone', label: 'Smart phone' },
    { icon: 'heroicons:gift-solid', label: 'Gift' },
    { icon: 'heroicons:user-group-solid', label: 'People' },
    { icon: 'heroicons:shopping-bag-solid', label: 'Shopping bag' },
    { icon: 'teenyicons:church-solid', label: 'Church' },
    { icon: 'heroicons:tv-solid', label: 'Television' },
    { icon: 'heroicons:banknotes-solid', label: 'Dollar bill' },
    { icon: 'heroicons:cake-solid', label: 'Cake' },
    { icon: 'heroicons:bolt-solid', label: 'Electricity' },
    { icon: 'heroicons:heart-solid', label: 'Heart' },
]

const activeColor = computed(() => props.color ?? '#6366f1')

function select(icon: string) {
    // Toggle off if already selected
    emit('update:modelValue', props.modelValue === icon ? null : icon)
}
</script>

<template>
    <div>
        <div class="flex flex-wrap gap-2">
            <button
                v-for="item in icons"
                :key="item.icon"
                type="button"
                :title="item.label"
                class="w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all hover:scale-110 focus:outline-none"
                :style="modelValue === item.icon
                    ? { backgroundColor: activeColor + '33', borderColor: activeColor, boxShadow: `0 0 0 2px ${activeColor}` }
                    : {}"
                :class="modelValue !== item.icon ? 'border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500' : ''"
                @click="select(item.icon)"
            >
                <UIcon
                    :name="item.icon"
                    class="w-4 h-4"
                    :style="modelValue === item.icon ? { color: activeColor } : {}"
                    :class="modelValue !== item.icon ? 'text-gray-500 dark:text-gray-400' : ''"
                />
            </button>
        </div>
        <!-- Preview label -->
        <p v-if="modelValue" class="mt-2 text-xs text-gray-400">
            {{ icons.find(i => i.icon === modelValue)?.label ?? modelValue }}
        </p>
        <p v-else class="mt-2 text-xs text-gray-400 italic">Auto (based on name)</p>
    </div>
</template>
