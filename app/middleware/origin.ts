export default defineNuxtRouteMiddleware(async (to) => {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated.value) return

  const { origins, originsChecked, setActiveOrigin } = useZeusContext()

  if (!originsChecked.value) {
    await useZeusContext().checkOrigins()
  }

  if (!origins.value.length) {
    if (to.path !== '/sin-acceso') return navigateTo('/sin-acceso')
    return
  }

  const urlName = to.params.origin as string | undefined
  if (urlName) {
    const match = origins.value.find((o) => o.profile.url_name === urlName)
    if (!match) {
      return navigateTo(`/${origins.value[0].profile.url_name}/aplicaciones`)
    }
    setActiveOrigin(match)
  }
})
