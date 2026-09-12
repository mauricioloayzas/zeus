import type { PuntoEmision, PuntoEmisionForm } from '~/types'

export function usePuntosEmision() {
  const { get, post, patch, del } = useApi('caja')

  async function list(profileId: string): Promise<PuntoEmision[]> {
    const res = await get<PuntoEmision[]>(`/profiles/${profileId}/puntos-emision`)
    return (res as unknown as { data: PuntoEmision[] }).data ?? []
  }

  async function create(profileId: string, data: PuntoEmisionForm): Promise<PuntoEmision> {
    const res = await post<PuntoEmision>(`/profiles/${profileId}/puntos-emision`, data)
    return (res as unknown as { data: PuntoEmision }).data
  }

  async function update(profileId: string, id: string, data: PuntoEmisionForm): Promise<PuntoEmision> {
    const res = await patch<PuntoEmision>(`/profiles/${profileId}/puntos-emision/${id}`, data)
    return (res as unknown as { data: PuntoEmision }).data
  }

  async function remove(profileId: string, id: string): Promise<void> {
    await del(`/profiles/${profileId}/puntos-emision/${id}`)
  }

  return { list, create, update, remove }
}
