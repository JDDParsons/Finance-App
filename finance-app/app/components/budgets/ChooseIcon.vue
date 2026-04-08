<script setup lang="ts">
const props = defineProps<{
    modelValue: string | null
    color?: string | null
}>()

const emit = defineEmits<{
    'update:modelValue': [value: string | null]
}>()

const icons = [
    { icon: 'heroicons:shopping-cart-solid', label: 'Groceries' },
    { icon: 'heroicons:home-solid', label: 'Housing' },
    { icon: 'streamline-ultimate:car-3-bold', label: 'Transport' },
    { icon: 'heroicons:cake-solid', label: 'Dining' },
    { icon: 'heroicons:bolt-solid', label: 'Utilities' },
    { icon: 'heroicons:heart-solid', label: 'Health' },
    { icon: 'heroicons:shopping-bag-solid', label: 'Shopping' },
    { icon: 'heroicons:banknotes-solid', label: 'Savings' },
    { icon: 'heroicons:paper-airplane-solid', label: 'Travel' },
    { icon: 'heroicons:trophy-solid', label: 'Fitness' },
    { icon: 'heroicons:face-smile-solid', label: 'Pets' },
    { icon: 'heroicons:academic-cap-solid', label: 'Education' },
    { icon: 'heroicons:tv-solid', label: 'Subscriptions' },
    { icon: 'heroicons:shield-check-solid', label: 'Insurance' },
    { icon: 'heroicons:sparkles-solid', label: 'Personal' },
    { icon: 'heroicons:gift-solid', label: 'Gifts' },
    { icon: 'heroicons:user-group-solid', label: 'Kids' },
    { icon: 'heroicons:film-solid', label: 'Entertainment' },
    { icon: 'heroicons:ellipsis-horizontal-circle-solid', label: 'Misc' },
    { icon: 'teenyicons:church-solid', label: 'Tithe' },
    { icon: 'heroicons:wallet-solid', label: 'Other' },
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
