export default defineNuxtRouteMiddleware((to) => {
  const { isAuthenticated, isSessionExpired, clearSession, updateActivity } = useAuth()

  const publicPaths = ['/login']

  if (isAuthenticated.value && isSessionExpired()) {
    clearSession()
    return navigateTo('/login')
  }

  if (!isAuthenticated.value && !publicPaths.includes(to.path)) {
    return navigateTo('/login')
  }

  if (isAuthenticated.value && to.path === '/login') {
    return navigateTo('/')
  }

  if (isAuthenticated.value) {
    updateActivity()
  }
})
