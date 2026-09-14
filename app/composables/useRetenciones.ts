import type { ComprobanteRetencion } from '~/types'

export function useRetenciones() {
  const { get } = useApi('caja')

  async function list(profileId: string): Promise<ComprobanteRetencion[]> {
    const res = await get<ComprobanteRetencion[]>(`/profiles/${profileId}/retenciones`)
    return (res as unknown as { data: ComprobanteRetencion[] }).data ?? []
  }

  return { list }
}
