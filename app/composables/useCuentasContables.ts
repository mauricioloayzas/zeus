import type { CuentaContableProfile } from '~/types'

export function useCuentasContables() {
  const { get } = useApi('yupana')

  async function list(profileId: string, soloDetalle = false): Promise<CuentaContableProfile[]> {
    const res = await get<CuentaContableProfile[]>(`/perfiles/${profileId}/cuentas`, soloDetalle ? { solo_detalle: '1' } : undefined)
    return (res as unknown as { data: CuentaContableProfile[] }).data ?? []
  }

  return { list }
}
