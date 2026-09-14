import type { Proforma } from '~/types'

export function useProformas() {
  const { get } = useApi('caja')

  async function list(profileId: string): Promise<Proforma[]> {
    const res = await get<Proforma[]>(`/profiles/${profileId}/proformas`)
    return (res as unknown as { data: Proforma[] }).data ?? []
  }

  return { list }
}
