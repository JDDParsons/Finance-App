import { getSession } from '../composables/supabase'

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
                return navigateTo('/menu');
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