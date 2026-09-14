import type { NotaDebito } from '~/types'

export function useNotasDebito() {
  const { get } = useApi('caja')

  async function list(profileId: string): Promise<NotaDebito[]> {
    const res = await get<NotaDebito[]>(`/profiles/${profileId}/notas-debito`)
    return (res as unknown as { data: NotaDebito[] }).data ?? []
  }

  return { list }
}
