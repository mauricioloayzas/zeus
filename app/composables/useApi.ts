import type { ApiResponse } from '~/types'

type ApiService = 'auth' | 'collector' | 'caja' | 'notifier' | 'yupana'

export function useApi(service: ApiService = 'auth') {
  const config = useRuntimeConfig()
  const { token } = useAuth()

  const baseUrl =
    service === 'collector' ? config.public.apiCollectorBase :
    service === 'caja' ? config.public.apiCajaBase :
    service === 'notifier' ? config.public.apiNotifierBase :
    service === 'yupana' ? config.public.apiYupanaBase :
    config.public.apiAuthBase

  async function request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    }

    if (token.value) {
      headers['Authorization'] = `Bearer ${token.value}`
    }

    const response = await fetch(`${baseUrl}${endpoint}`, {
      ...options,
      headers,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Error de red' }))
      throw new Error(error.message || error.error || `Error ${response.status}`)
    }

    return response.json()
  }

  function buildUrl(endpoint: string, params?: Record<string, string | number | undefined>): string {
    if (!params) return endpoint
    const entries = Object.entries(params).filter(([, v]) => v !== undefined) as [string, string | number][]
    if (entries.length === 0) return endpoint
    const qs = new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString()
    return `${endpoint}?${qs}`
  }

  return {
    get: <T>(endpoint: string, params?: Record<string, string | number | undefined>) =>
      request<T>(buildUrl(endpoint, params), { method: 'GET' }),
    post: <T>(endpoint: string, body: unknown) =>
      request<T>(endpoint, { method: 'POST', body: JSON.stringify(body) }),
    put: <T>(endpoint: string, body: unknown) =>
      request<T>(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
    patch: <T>(endpoint: string, body: unknown) =>
      request<T>(endpoint, { method: 'PATCH', body: JSON.stringify(body) }),
    del: <T>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' }),
  }
}
