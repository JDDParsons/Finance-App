<script setup>

</script>
<template>
    <div>
        <UHeader title="Personal Finance App" />

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

                    <NuxtLink to="/statements">
                        <UCard
                            class="cursor-pointer transition transform hover:scale-105 hover:shadow-xl active:scale-95
                                flex flex-col items-center justify-center mt-8 p-4 h-48"
                        >
                            <h2 class="text-lg font-semibold text-center">Statements</h2>
                            <p class="text-sm text-center"> Browse groups and their transaction counts </p>
                        </UCard>
                    </NuxtLink>
                </div>
            </UContainer>
        </UMain>
    </div>
</template>