import type { Factura } from '~/types'

export function useFacturas() {
  const { get } = useApi('caja')

  async function list(profileId: string): Promise<Factura[]> {
    const res = await get<Factura[]>(`/profiles/${profileId}/facturas`)
    return (res as unknown as { data: Factura[] }).data ?? []
  }

  return { list }
}
