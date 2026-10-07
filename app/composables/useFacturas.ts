import type { Factura, FacturaCreateForm } from '~/types'

export function useFacturas() {
  const { get, post } = useApi('caja')

  async function list(profileId: string): Promise<Factura[]> {
    const res = await get<Factura[]>(`/profiles/${profileId}/facturas`)
    return (res as unknown as { data: Factura[] }).data ?? []
  }

  async function create(profileId: string, data: FacturaCreateForm): Promise<Factura> {
    const res = await post<Factura>(`/profiles/${profileId}/facturas`, data)
    return res.data
  }

  return { list, create }
}
