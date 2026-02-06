import { getSession } from '../composables/supabase'
export default defineNuxtRouteMiddleware(async (to) => {
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
})