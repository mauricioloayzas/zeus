import type { Proforma, ProformaCreateForm } from '~/types'

export function useProformas() {
  const { get, post } = useApi('caja')

  async function list(profileId: string): Promise<Proforma[]> {
    const res = await get<Proforma[]>(`/profiles/${profileId}/proformas`)
    return (res as unknown as { data: Proforma[] }).data ?? []
  }

  async function create(profileId: string, data: ProformaCreateForm): Promise<Proforma> {
    const res = await post<Proforma>(`/profiles/${profileId}/proformas`, data)
    return res.data
  }

  return { list, create }
}
