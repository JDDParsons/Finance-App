import { getSession } from '~/composables/supabase'
import { useProfileStore } from '~/stores/profile'

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
            // Ensure profile (and household_id) is resolved and cached for all authenticated routes
            const profileStore = useProfileStore()
            if (!profileStore.isReady) {
                try {
                    await profileStore.init()
                } catch {
                    console.warn('No profile found for user, redirecting to login.')
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