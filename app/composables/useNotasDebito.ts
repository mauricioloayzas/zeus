import type { NotaDebito, NotaDebitoCreateForm } from '~/types'

export function useNotasDebito() {
  const { get, post } = useApi('caja')

  async function list(profileId: string): Promise<NotaDebito[]> {
    const res = await get<NotaDebito[]>(`/profiles/${profileId}/notas-debito`)
    return (res as unknown as { data: NotaDebito[] }).data ?? []
  }

  async function create(profileId: string, data: NotaDebitoCreateForm): Promise<NotaDebito> {
    const res = await post<NotaDebito>(`/profiles/${profileId}/notas-debito`, data)
    return res.data
  }

  return { list, create }
}
