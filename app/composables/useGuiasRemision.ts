import type { GuiaRemision, GuiaRemisionCreateForm } from '~/types'

export function useGuiasRemision() {
  const { get, post } = useApi('caja')

  async function list(profileId: string): Promise<GuiaRemision[]> {
    const res = await get<GuiaRemision[]>(`/profiles/${profileId}/guias-remision`)
    return (res as unknown as { data: GuiaRemision[] }).data ?? []
  }

  async function create(profileId: string, data: GuiaRemisionCreateForm): Promise<GuiaRemision> {
    const res = await post<GuiaRemision>(`/profiles/${profileId}/guias-remision`, data)
    return res.data
  }

  return { list, create }
}
