<script setup>

import { form } from '#build/ui';
import { ref } from 'vue'

const formSubmitted = ref(false);
const formState = ref({});
resetFormState();

const progress = computed(() => {
    let filledFields = 0;
    const totalFields = Object.keys(formState.value).length;

    for (const key in formState.value) {
        if (formState.value[key] !== null && formState.value[key] !== '') {
            filledFields++;
        }
    }

    return Math.round((filledFields / totalFields) * 100);
});

function resetFormState() {
    formState.value = {
        bmoChequing1: null,
        bmoChequing2: null,
        bmoMastercard: null,
        questradeMargin: null,
        questradeTfsa: null,
        questradeRrsp: null,
        questradeLrsp: null,
        questradeFhsa: null,
        scotiabankChequing: null,
        scotiabankSavings: null,
        scotiabankVisa: null,
        pcMastercard: null
    };
}

const total = computed(() => 
    formState.value.bmoChequing1 + 
    formState.value.bmoChequing2 + 
    formState.value.bmoMastercard * -1 + 
    formState.value.questradeMargin + 
    formState.value.questradeTfsa + 
    formState.value.questradeRrsp + 
    formState.value.questradeLrsp + 
    formState.value.questradeFhsa + 
    formState.value.scotiabankChequing + 
    formState.value.scotiabankSavings + 
    formState.value.scotiabankVisa * -1 + 
    formState.value.pcMastercard * -1
);

async function handleSubmit() {
    const response = await $fetch('/api/form', {
        method: 'POST',
        body: formState.value
    })
    formSubmitted.value = true;
    resetFormState();
}

</script>
<template>
    <div>
        <UHeader title="Personal Finance App" />
        <UMain>
            <UContainer>
                <div v-if="formSubmitted">
                    <div class="flex flex-col items-center justify-center p-8 mb-12 space-y-4">
                        <h1 class="text-xl font-bold">Balances saved successfully!</h1>
                        <p>Your account balances have been recorded.</p>
                        <div class="flex space-x-4 mt-8">
                            <UButton to="/" color="neutral" variant="outline" size="xl">Go to Home</UButton>
                        </div>
                    </div>
                </div>
                <div v-else class="divider mb-8">
                    <div class="grid grid-cols-2 pt-8 space-y-4"> 
                        <div>                   
                            <h1 class="text-xl font-bold">Record a snapshot of your balances</h1>
                            <p>Enter the current balances for your accounts.</p>
                            <p class="text-lg font-bold text-gray-300 pt-2"> {{ `Total: $${total}` }} </p>
                        </div> 
                        <div class="pb-4 flex items-center justify-end pr-20">
                            <UButton v-if="progress==100" @click="handleSubmit()" class="p-6 inline-block" type="submit" active color="primary" variant="outline" active-color="primary" active-variant="outline" size="xl">Save balances</UButton>
                        </div>
                    </div>
                    <UProgress class="pb-2" v-model="progress" />
                <USeparator />
                <UForm>
                  <div class="grid grid-cols-4 gap-4 pt-8 mt-6">
                        <div class="col-span-1">
                            <UFormField label="BMO Chequing" description="" class="text-lg font-semibold mb-4" required>
                                <UInput type="number" variant="soft" size="xl" color="neutral" placeholder="Enter an amount..." v-model="formState.bmoChequing1"/>
                            </UFormField>
                        </div>

                        <div class="col-span-1">
                            <UFormField label="Questrade Margin" description="" class="text-lg font-semibold mb-4" required>
                            <UInput type="number" variant="soft" size="xl" color="neutral" placeholder="Enter an amount..." v-model="formState.questradeMargin" />
                        </UFormField>
                        </div>

                        <div class="col-span-1">
                            <UFormField label="Scotiabank Chequing" description="" class="text-lg font-semibold mb-4" required>
                                <UInput type="number" variant="soft" size="xl" color="neutral" placeholder="Enter an amount..." v-model="formState.scotiabankChequing" />
                            </UFormField>
                        </div>
                        <div class="col-span-1">
                            <UFormField label="PC Financial Mastercard" description="" class="text-lg font-semibold mb-4" required>
                                <UInput type="number" variant="soft" size="xl" color="neutral" placeholder="Enter an amount..." v-model="formState.pcMastercard" />
                            </UFormField>
                        </div>
                  </div>

                  <div class="grid grid-cols-4 gap-4 mt-6">
                      <div class="col-span-1">
                        <UFormField label="BMO Chequing (Joint)" description="" class="text-lg font-semibold mb-4" required>
                                <UInput type="number" variant="soft" size="xl" color="neutral" placeholder="Enter an amount..." v-model="formState.bmoChequing2" />
                            </UFormField>
                      </div>

                      <div class="col-span-1">
                        <UFormField label="Questrade TFSA" description="" class="text-lg font-semibold mb-4" required>
                            <UInput type="number" variant="soft" size="xl" color="neutral" placeholder="Enter an amount..." v-model="formState.questradeTfsa" />
                        </UFormField>
                      </div>

                      <div class="col-span-1">
                        <UFormField label="Scotiabank Savings" description="" class="text-lg font-semibold mb-4" required>
                                <UInput type="number" variant="soft" size="xl" color="neutral" placeholder="Enter an amount..." v-model="formState.scotiabankSavings" />
                            </UFormField>
                      </div>

                      <div class="col-span-1 flex items-end justify-end">
                            
                      </div>
                  </div>

                  <div class="grid grid-cols-4 gap-4 mt-6">
                    <div class="col-span-1">
                        <UFormField label="BMO MasterCard" description="" class="text-lg font-semibold mb-4" required>
                                <UInput type="number" variant="soft" size="xl" color="neutral" placeholder="Enter an amount..." v-model="formState.bmoMastercard" />
                            </UFormField>
                    </div>

                    <div class="col-span-1">
                        <UFormField label="Questrade RRSP" description="" class="text-lg font-semibold mb-4" required>
                            <UInput type="number" variant="soft" size="xl" color="neutral" placeholder="Enter an amount..." v-model="formState.questradeRrsp" />
                        </UFormField>
                    </div>

                    <div class="col-span-1">
                        <UFormField label="Scotiabank Visa" description="" class="text-lg font-semibold mb-4" required>
                            <UInput type="number" variant="soft" size="xl" color="neutral" placeholder="Enter an amount..." v-model="formState.scotiabankVisa" />
                        </UFormField>
                    </div>

                    <div class="col-span-1"></div>

                </div>
                

                <div class="grid grid-cols-4 gap-4 mt-6" >
                    <div class="col-span-1">
                        
                    </div>


                    <div class="col-span-1">
                        <UFormField label="Questrade LRSP" description="" class="text-lg font-semibold mb-4" required>
                            <UInput type="number" variant="soft" size="xl" color="neutral" placeholder="Enter an amount..." v-model="formState.questradeLrsp" />
                        </UFormField>
                    </div>   
                    
                    <div class="col-span-1"></div>

                </div>

                <div class="grid grid-cols-4 gap-4 mt-6">
                    <div class="col-span-1">
                        
                    </div>

                    <div class="col-span-1">
                        <UFormField label="Questrade FHSA" description="" class="text-lg font-semibold mb-4" required>
                            <UInput type="number" variant="soft" size="xl" color="neutral" placeholder="Enter an amount..." v-model="formState.questradeFhsa" />
                        </UFormField>
                    </div>

                    <div class="col-span-1"></div>

                    <div class="col-span-1"> 
                        
                    </div>                                           
                </div>
            </UForm> 
            </div>
            </UContainer>
        </UMain>
    </div>
</template>