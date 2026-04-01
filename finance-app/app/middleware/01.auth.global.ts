import { getSession } from '~/composables/supabase'
import { useHouseholdStore } from '~/stores/household'

export default defineNuxtRouteMiddleware(async (to) => {
    // Skip auth middleware during prerendering to avoid 500 errors
    if (import.meta.server && !import.meta.client) {
        return;
    }

    try {
        const session = await getSession();
        if (!session) {
            if (to.path !== '/') {
                return navigateTo('/');
            }
        } else if (session) {
            if (to.path === '/') {
                return navigateTo('/home');
            }
            // Ensure household_id is resolved and cached for all authenticated routes
            const householdStore = useHouseholdStore()
            if (!householdStore.isReady) {
                try {
                    await householdStore.init()
                } catch {
                    // User is authenticated but has no household — redirect to root
                    console.warn('No household found for user, redirecting to login.')
                    return navigateTo('/')
                }
            }
        }
    } catch (error) {
        // Handle auth errors gracefully during build
        console.warn('Auth check failed:', error);
        if (to.path !== '/') {
            return navigateTo('/');
        }
    }
})