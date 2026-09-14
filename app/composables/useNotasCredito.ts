import type { NotaCredito } from '~/types'

export function useNotasCredito() {
  const { get } = useApi('caja')

  async function list(profileId: string): Promise<NotaCredito[]> {
    const res = await get<NotaCredito[]>(`/profiles/${profileId}/notas-credito`)
    return (res as unknown as { data: NotaCredito[] }).data ?? []
  }

  return { list }
}
