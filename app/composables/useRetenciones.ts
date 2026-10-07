import type { ComprobanteRetencion, RetencionCreateForm } from '~/types'

export function useRetenciones() {
  const { get, post } = useApi('caja')

  async function list(profileId: string): Promise<ComprobanteRetencion[]> {
    const res = await get<ComprobanteRetencion[]>(`/profiles/${profileId}/retenciones`)
    return (res as unknown as { data: ComprobanteRetencion[] }).data ?? []
  }

  async function create(profileId: string, data: RetencionCreateForm): Promise<ComprobanteRetencion> {
    const res = await post<ComprobanteRetencion>(`/profiles/${profileId}/retenciones`, data)
    return res.data
  }

  return { list, create }
}
