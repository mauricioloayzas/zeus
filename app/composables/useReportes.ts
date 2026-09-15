import type { AtsResult, DocumentoZipTipo, DocumentZipResult, Formulario104Result, ReporteRetencionesResult } from '~/types'

export function useReportes() {
  const { get } = useApi('caja')

  async function formulario104(profileId: string, periodo: string): Promise<Formulario104Result> {
    const res = await get<Formulario104Result>(`/profiles/${profileId}/reportes/formulario-104`, { periodo })
    return (res as unknown as { data: Formulario104Result }).data
  }

  async function ats(profileId: string, periodo: string): Promise<AtsResult> {
    const res = await get<AtsResult>(`/profiles/${profileId}/reportes/ats`, { periodo })
    return (res as unknown as { data: AtsResult }).data
  }

  async function downloadZip(profileId: string, desde: string, hasta: string, tipos: DocumentoZipTipo[] = []): Promise<DocumentZipResult> {
    const res = await get<DocumentZipResult>(`/profiles/${profileId}/documentos/zip`, {
      desde,
      hasta,
      tipos: tipos.length ? tipos.join(',') : undefined,
    })
    return (res as unknown as { data: DocumentZipResult }).data
  }

  async function retenciones(profileId: string, desde: string, hasta: string, formato: 'csv' | 'pdf' = 'csv'): Promise<ReporteRetencionesResult> {
    const res = await get<ReporteRetencionesResult>(`/profiles/${profileId}/reportes/retenciones`, { desde, hasta, formato })
    return (res as unknown as { data: ReporteRetencionesResult }).data
  }

  return { formulario104, ats, downloadZip, retenciones }
}
