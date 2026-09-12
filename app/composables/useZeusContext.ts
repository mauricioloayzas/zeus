import type { Application, Profile, Rbac, Role } from '~/types'

export interface OriginContext {
  profile: Profile
  application: Application | null
  roleName: string | null
}

/**
 * Equivalente de useProfile.ts en caja-registradora/frontend, pero el "perfil activo" de
 * Zeus es siempre un perfil type=service (el "origin"/raíz de una app) — no una company.
 * El acceso ya lo filtra el backend (ver ProfileAccessMiddleware::checkOriginAdmin() /
 * check() con cadena de ancestros en orchestrator), acá solo se arma la lista para el
 * selector: un usuario puede administrar el origin de más de una app (ej. Clichín y
 * Hayayaku/Vaco) si tiene RBAC en ambos.
 */
export function useZeusContext() {
  const config = useRuntimeConfig()
  const { token, user } = useAuth()
  const { list: listProfiles } = useProfiles()
  const { list: listApplications } = useApplications()

  const origins = useState<OriginContext[]>('zeus_origins', () => [])
  const activeOrigin = useState<OriginContext | null>('zeus_active_origin', () => null)
  const originsChecked = useState<boolean>('zeus_origins_checked', () => false)
  const roles = useState<Role[]>('zeus_roles', () => [])

  async function fetchRbacs(userId: string): Promise<Rbac[]> {
    const response = await fetch(`${config.public.apiAuthBase}/profiles/rbacs/by-user?user_id=${userId}`, {
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token.value}` },
    })
    if (!response.ok) return []
    return response.json()
  }

  async function ensureRoles(): Promise<Role[]> {
    if (roles.value.length) return roles.value
    try {
      const response = await fetch(`${config.public.apiAuthBase}/roles`, {
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token.value}` },
      })
      if (response.ok) roles.value = await response.json()
    } catch {
      roles.value = []
    }
    return roles.value
  }

  /** true solo para el rol Owner en el contexto activo — gatea Aplicaciones/Perfiles/WhatsApp/firma. */
  const isOwner = computed(() => activeOrigin.value?.roleName === 'Owner')
  /** El rol Contador solo ve Facturas/Contabilidad/Suscripciones (ver layouts/admin.vue). */
  const isContador = computed(() => activeOrigin.value?.roleName === 'Contador')

  async function checkOrigins(): Promise<OriginContext[]> {
    if (!user.value?.id) {
      originsChecked.value = true
      return []
    }

    const [rbacs, allRoles, allProfiles, allApplications] = await Promise.all([
      fetchRbacs(user.value.id),
      ensureRoles(),
      listProfiles(),
      listApplications(),
    ])

    const profilesById = new Map(allProfiles.map((p) => [p.id, p]))
    const applicationsById = new Map(allApplications.map((a) => [a.id, a]))
    const rolesById = new Map(allRoles.map((r) => [r.id, r]))

    const result: OriginContext[] = []
    for (const rbac of rbacs) {
      const profile = profilesById.get(rbac.profile_id)
      if (!profile || profile.type !== 'service') continue

      result.push({
        profile,
        application: applicationsById.get(rbac.application_id) ?? null,
        roleName: rolesById.get(rbac.role_id)?.name ?? null,
      })
    }

    origins.value = result
    activeOrigin.value = result[0] ?? null
    originsChecked.value = true
    return result
  }

  function setActiveOrigin(ctx: OriginContext) {
    activeOrigin.value = ctx
  }

  function clearContext() {
    origins.value = []
    activeOrigin.value = null
    originsChecked.value = false
    roles.value = []
  }

  return {
    origins,
    activeOrigin,
    originsChecked,
    isOwner,
    isContador,
    checkOrigins,
    setActiveOrigin,
    clearContext,
  }
}
