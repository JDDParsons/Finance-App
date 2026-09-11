import { getSupabase } from '~/composables/supabase/client'

export default defineNuxtRouteMiddleware(async (to) => {
    // Skip auth middleware during prerendering to avoid 500 errors
    if (import.meta.server && !import.meta.client) {
        return;
    }

    try {
        const supabase = getSupabase()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
            if (to.path !== '/') {
                return navigateTo('/');
            }
        } else if (session) {
            if (to.path === '/') {
                return navigateTo('/home');
            }
            // Profile data is hydrated by useAppData. A session-only route gate
            // lets a previously loaded account open while the device is offline.
        }
    } catch (error) {
        // Handle auth errors gracefully during build
        console.warn('Auth check failed:', error);
        if (to.path !== '/') {
            return navigateTo('/');
        }
    }
})
