import { resolveSession } from '~/composables/supabase/session'

export default defineNuxtRouteMiddleware(async (to) => {
    // Skip auth middleware during prerendering to avoid 500 errors
    if (import.meta.server && !import.meta.client) {
        return;
    }

    try {
        // 'signed-in' and 'offline' (signed in, but the server can't be reached to
        // refresh an expired token) both count as signed in, so a previously
        // loaded account still opens without a connection.
        const auth = await resolveSession()
        if (auth.state === 'signed-out') {
            if (to.path !== '/') {
                return navigateTo('/');
            }
        } else if (to.path === '/') {
            return navigateTo('/home');
        }
        // Profile data is hydrated by useAppData.
    } catch (error) {
        // Handle auth errors gracefully during build
        console.warn('Auth check failed:', error);
        if (to.path !== '/') {
            return navigateTo('/');
        }
    }
})
