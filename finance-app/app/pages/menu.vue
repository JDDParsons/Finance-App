<script setup>
</script>

<template>
    <div>
        <UHeader title="Personal Finance App">
          <template #right>
            <UColorModeSwitch />
          </template>
        </UHeader>
        <UMain>
            <UContainer>
                <div class="grid grid-cols-4 gap-4">
                    <NuxtLink to="/upload">
                        <UCard
                            class="cursor-pointer transition transform hover:scale-105 hover:shadow-xl active:scale-95
                                flex flex-col items-center justify-center mt-8 p-4 h-48"
                        >
                            <h2 class="text-lg font-semibold text-center">Upload</h2>
                            <p class="text-sm text-center"> Upload a bank statement</p>
                        </UCard>
                    </NuxtLink>

                    <NuxtLink to="/reports">
                        <UCard
                            class="cursor-pointer transition transform hover:scale-105 hover:shadow-xl active:scale-95
                                flex flex-col items-center justify-center mt-8 p-4 h-48"
                        >
                            <h2 class="text-lg font-semibold text-center">View</h2>
                            <p class="text-sm text-center"> Browse data and reports </p>
                        </UCard>
                    </NuxtLink>
                </div>
            </UContainer>
        </UMain>
    </div>
</template>
