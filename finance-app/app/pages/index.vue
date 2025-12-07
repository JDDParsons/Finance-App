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
                        
                        <h3 class="text-lg font-semibold">Upload a bank statement</h3>
                    </UCard>
                </NuxtLink>
                </div>
            </UContainer>
        </UMain>
    </div>
</template>