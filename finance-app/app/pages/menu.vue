<script setup>
import { signOut } from '../composables/supabase'
</script>

<template>
    <div>
        <UHeader title="Finance App">
          <template #right>
            <UColorModeSwitch />
            <UButton class="ml-2" color="neutral" variant="ghost" size="sm" @click="signOut()">Sign out</UButton>
          </template>
        </UHeader>
        <UMain>
            <UContainer>
                <div class="flex flex-col justify-center">
                    <NuxtLink to="/upload">
                        <UCard
                            class="cursor-pointer transition transform hover:scale-105 hover:shadow-xl active:scale-95
                                flex flex-col items-center justify-center mt-8 p-4 h-50"
                        >
                        <template #header>
                            <h2 class="text-lg font-semibold text-center">Upload file</h2>
                        </template>
                            <div class="flex flex-col justify-center items-center gap-2">
                                <UIcon name="flat-color-icons:upload" class="w-12 h-12" />
                            </div>
                        <template #footer>
                            <p class="text-sm text-center"> Save bank statement data</p>
                        </template>
                        </UCard>
                    </NuxtLink>

                    <NuxtLink to="/reports/monthly">
                        <UCard
                            class="cursor-pointer transition transform hover:scale-105 hover:shadow-xl active:scale-95
                                flex flex-col items-center justify-center mt-8 p-4 h-50"
                        >
                        <template #header>
                            <h2 class="text-lg font-semibold text-center">View Reports</h2>
                        </template>
                         <div class="flex flex-col justify-center items-center gap-2">
                            <UIcon name="flat-color-icons:doughnut-chart" class="w-12 h-12" />
                        </div>
                        <template #footer>
                            <p class="text-sm text-center"> See monthly inflows and outflows</p>
                        </template>
                        </UCard>
                    </NuxtLink>
                </div>
            </UContainer>
        </UMain>
    </div>
</template>
