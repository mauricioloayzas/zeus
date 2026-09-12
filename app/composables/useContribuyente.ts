import type { Contribuyente, ContribuyenteForm } from '~/types'

export function useContribuyente() {
  const { get, put } = useApi('caja')

  async function fetchContribuyente(profileId: string): Promise<Contribuyente | null> {
    const res = await get<Contribuyente | null>(`/profiles/${profileId}/contribuyente`)
    return (res as unknown as { data: Contribuyente | null }).data ?? null
  }

  async function update(profileId: string, data: ContribuyenteForm): Promise<Contribuyente> {
    const res = await put<Contribuyente>(`/profiles/${profileId}/contribuyente`, data)
    return (res as unknown as { data: Contribuyente }).data
  }

  return { fetchContribuyente, update }
}
