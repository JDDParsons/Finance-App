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
                            
                            <h2 class="text-lg font-semibold text-center">Save your statements</h2>
                            <p class="text-sm text-center"> Upload a bank statement containing transaction data </p>
                        </UCard>
                    </NuxtLink>

                    <NuxtLink to="/snap">
                        <UCard
                            class="cursor-pointer transition transform hover:scale-105 hover:shadow-xl active:scale-95
                                flex flex-col items-center justify-center mt-8 p-4 h-48"
                        >
                            
                            <h2 class="text-lg font-semibold text-center">Snap your balances</h2>
                            <p class="text-sm text-gray-400 text-center"> Record a snapshot of all current account balances </p>
                        </UCard>
                    </NuxtLink>

                    <NuxtLink to="/reports">
                        <UCard
                            class="cursor-pointer transition transform hover:scale-105 hover:shadow-xl active:scale-95
                                flex flex-col items-center justify-center mt-8 p-4 h-48"
                        >
                            <h2 class="text-lg font-semibold text-center">View reports</h2>
                            <p class="text-sm text-center"> Browse annual and monthly reports </p>
                        </UCard>
                    </NuxtLink>
                </div>
            </UContainer>
        </UMain>
    </div>
</template>