<script setup>
import { sendMagicLink, validateCode, getSession} from '../composables/supabase'

const email = ref('');
const loading = ref(false);
const pin = ref('');
const codeRequested = ref(false);

onMounted(async () => {
    const session = await getSession();
    if (session) {
        await navigateTo('/menu');
    }
});

async function handleSendMagicLink() {
    loading.value = true;
    try {
        const result = await sendMagicLink(email.value);
        alert(result.message);
        if (result.success) {
            email.value = '';
            codeRequested.value = true;
        }
        else {
            codeRequested.value = false;
        }
    } finally {
        loading.value = false;
    }
}

watch(pin, async (newPin) => {
    if (newPin.length === 6) {
        await handleVerificationCode();
    }
});

async function handleVerificationCode() {
    const pinCode = Array.isArray(pin.value) ? pin.value.join('') : pin.value;
    const result = await validateCode(email.value, pinCode);

    if (result.session) {
        await navigateTo('/menu');
    }
    else if (result.error) {
        alert(result.error.message);
        pin.value = '';
        codeRequested.value = false;
    }
}

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
                <div class="flex flex-col items-center justify-center pt-25 space-y-8">

                    <div v-if="codeRequested">
                        <div class="text-center pb-10">
                            <h1 class="text-4xl font-bold mb-4">Check your email</h1>
                            <p class="text-lg text-gray-400">Enter the 6-digit code below to sign in.</p>
                        </div>
                        <UPinInput  v-model="pin" :length="6" color="primary" highlight size="xl" class="mt-4 w-full justify-center" />
                    </div>
                    <div v-else>
                        <div class="text-center pb-10">
                            <h1 class="text-4xl font-bold mb-4">Welcome!</h1>
                            <p class="text-lg text-gray-400">Enter your email to get started.</p>
                        </div>
                        <UCard class="w-full max-w-md p-8">
                            <UFormField description="" class="text-lg font-semibold mb-4" required>
                                <UInput 
                                    type="email" 
                                    variant="soft" 
                                    size="xl" 
                                    class="w-full"
                                    color="neutral" 
                                    placeholder="Enter your email..." 
                                    v-model="email"
                                    :disabled="loading"
                                />
                                <UButton 
                                    class="mt-4 w-full" 
                                    color="primary" 
                                    @click="handleSendMagicLink"
                                    :loading="loading"
                                >
                                    Send verification code
                                </UButton>
                            </UFormField>
                        </UCard>
                    </div>
                </div>
            </UContainer>
        </UMain>
    </div>
</template>