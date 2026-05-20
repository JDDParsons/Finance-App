<script setup>
import { sendVerificationCode, validateCode, getSession } from '~/composables/supabase'

useHead({ title: 'Budgify' })

const toast = useToast();
const email = ref('');
const emailError = ref('');
const loading = ref(false);
const pin = ref('');
const codeRequested = ref(false);

watch(email, () => { emailError.value = ''; });

onMounted(async () => {
    const session = await getSession();
    if (session) {
        await navigateTo('/home');
    }
});

async function handleSendVerificationCode() {
    loading.value = true;
    emailError.value = '';
    try {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email.value || !emailRegex.test(email.value)) {
            const msg = 'Please enter a valid email address.';
            emailError.value = msg;
            toast.add({ title: 'Invalid email', description: msg, color: 'error' });
            return;
        }
        const result = await sendVerificationCode(email.value);
        if (!result.success) {
            emailError.value = result.message;
        }
        toast.add({
            title: result.success ? 'Email sent' : 'Error',
            description: result.message,
            color: result.success ? 'success' : 'error',
        });
        if (result.success) {
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
        await navigateTo('/home');
    }
    else if (result.error) {
        toast.add({
            title: 'Invalid code',
            description: result.error.message,
            color: 'error',
        });
        pin.value = '';
        codeRequested.value = false;
    }
}

</script>
<template>
    <div>
        <UMain>
            <UContainer>
                <UColorModeButton class="absolute top-4 right-4" />
                <div class="flex flex-col items-center justify-center pt-25 space-y-8">

                    <div v-if="codeRequested">
                        <div class="text-center pb-10">
                            <h1 class="text-4xl font-bold mb-4">Check your email</h1>
                            <p class="text-lg text-gray-400">Enter the 6-digit code below to sign in.</p>
                        </div>
                        <UPinInput  v-model="pin" :length="6" color="primary" highlight size="xl" class="mt-4 w-80 justify-center" />
                    </div>
                    <div v-else class="flex flex-col items-center">
                        <div class="pb-5">
                            <img src="/BudgifyWithLabel.png" alt="Budgify" class="h-90" />
                        </div>
                        <div>
                            <UFormField :error="emailError || undefined" class="mb-2 w-80">
                                <UInput 
                                    type="email" 
                                    variant="soft" 
                                    size="xl" 
                                    class="w-full"
                                    color="neutral" 
                                    placeholder="Enter your email" 
                                    v-model="email"
                                    :disabled="loading"
                                />
                            </UFormField>
                            <UButton 
                                class="h-8 w-full bg-linear-to-r from-green-500 to-emerald-600 text-base font-semibold text-white shadow-lg shadow-green-500/30 transition-all duration-200 hover:from-green-600 hover:to-emerald-700 hover:shadow-green-500/50 active:scale-[0.98]" 
                                color="primary" 
                                @click="handleSendVerificationCode"
                                :loading="loading"
                            >
                                Send verification code
                            </UButton>
                        </div>
                    </div>
                </div>
            </UContainer>
        </UMain>
    </div>
</template>