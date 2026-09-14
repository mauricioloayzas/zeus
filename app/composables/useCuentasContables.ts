import type { CuentaContableProfile, CuentaContableInitResult } from '~/types'

export function useCuentasContables() {
  const { get, post } = useApi('yupana')

  async function list(profileId: string, soloDetalle = false): Promise<CuentaContableProfile[]> {
    const res = await get<CuentaContableProfile[]>(`/perfiles/${profileId}/cuentas`, soloDetalle ? { solo_detalle: '1' } : undefined)
    return (res as unknown as { data: CuentaContableProfile[] }).data ?? []
  }

  /** Clona el catálogo NIIF hacia el perfil. Idempotente: si ya está activado, no duplica. */
  async function activar(profileId: string): Promise<CuentaContableInitResult> {
    const res = await post<CuentaContableInitResult>(`/perfiles/${profileId}/cuentas/init`, {})
    return (res as unknown as { data: CuentaContableInitResult }).data
  }

  return { list, activar }
}
