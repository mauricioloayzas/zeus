import type { MayorContable } from '~/types'

export function useMayorContable() {
  const { get } = useApi('yupana')

  /** Todos los movimientos mensuales acumulados de una cuenta (histórico completo). */
  async function listByCuenta(profileId: string, cuentaId: string): Promise<MayorContable[]> {
    const res = await get<MayorContable[]>(`/perfiles/${profileId}/mayor`, { cuenta_id: cuentaId })
    return (res as unknown as { data: MayorContable[] }).data ?? []
  }

  return { listByCuenta }
}
