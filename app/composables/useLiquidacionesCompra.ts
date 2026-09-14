import type { LiquidacionCompra } from '~/types'

export function useLiquidacionesCompra() {
  const { get } = useApi('caja')

  async function list(profileId: string): Promise<LiquidacionCompra[]> {
    const res = await get<LiquidacionCompra[]>(`/profiles/${profileId}/liquidaciones-compra`)
    return (res as unknown as { data: LiquidacionCompra[] }).data ?? []
  }

  return { list }
}
