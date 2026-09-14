import type { GuiaRemision } from '~/types'

export function useGuiasRemision() {
  const { get } = useApi('caja')

  async function list(profileId: string): Promise<GuiaRemision[]> {
    const res = await get<GuiaRemision[]>(`/profiles/${profileId}/guias-remision`)
    return (res as unknown as { data: GuiaRemision[] }).data ?? []
  }

  return { list }
}
