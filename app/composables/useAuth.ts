import type { AuthTokens, User } from '~/types'

const INACTIVITY_TIMEOUT = 30 * 60 // 30 minutos en segundos

export function useAuth() {
  const token = useCookie<string | null>('zeus_token', {
    default: () => null,
    maxAge: 60 * 60 * 24 * 7,
    sameSite: 'strict',
  })
  const user = useCookie<User | null>('zeus_user', {
    default: () => null,
    maxAge: 60 * 60 * 24 * 7,
    sameSite: 'strict',
  })
  const lastActivity = useCookie<number | null>('zeus_last_activity', {
    default: () => null,
    maxAge: 60 * 60 * 24 * 7,
    sameSite: 'strict',
  })

  const isAuthenticated = computed(() => !!token.value)

  function isSessionExpired(): boolean {
    if (!lastActivity.value) return false
    const elapsed = Math.floor(Date.now() / 1000) - lastActivity.value
    return elapsed > INACTIVITY_TIMEOUT
  }

  function updateActivity() {
    lastActivity.value = Math.floor(Date.now() / 1000)
  }

  function setSession(tokens: AuthTokens, userData: User) {
    token.value = tokens.accessToken
    user.value = userData
    updateActivity()
  }

  function clearSession() {
    token.value = null
    user.value = null
    lastActivity.value = null
  }

  return {
    token,
    user,
    isAuthenticated,
    setSession,
    clearSession,
    isSessionExpired,
    updateActivity,
  }
}
