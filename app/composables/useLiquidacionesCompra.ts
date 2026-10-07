import type { LiquidacionCompra, LiquidacionCompraCreateForm } from '~/types'

export function useLiquidacionesCompra() {
  const { get, post } = useApi('caja')

  async function list(profileId: string): Promise<LiquidacionCompra[]> {
    const res = await get<LiquidacionCompra[]>(`/profiles/${profileId}/liquidaciones-compra`)
    return (res as unknown as { data: LiquidacionCompra[] }).data ?? []
  }

  async function create(profileId: string, data: LiquidacionCompraCreateForm): Promise<LiquidacionCompra> {
    const res = await post<LiquidacionCompra>(`/profiles/${profileId}/liquidaciones-compra`, data)
    return res.data
  }

  return { list, create }
}
