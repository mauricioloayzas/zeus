import type { NotaCredito, NotaCreditoCreateForm } from '~/types'

export function useNotasCredito() {
  const { get, post } = useApi('caja')

  async function list(profileId: string): Promise<NotaCredito[]> {
    const res = await get<NotaCredito[]>(`/profiles/${profileId}/notas-credito`)
    return (res as unknown as { data: NotaCredito[] }).data ?? []
  }

  async function create(profileId: string, data: NotaCreditoCreateForm): Promise<NotaCredito> {
    const res = await post<NotaCredito>(`/profiles/${profileId}/notas-credito`, data)
    return res.data
  }

  return { list, create }
}
