import type { BalanceGeneral, EstadoFlujoEfectivo, EstadoResultados, ReporteContablePdfResult } from '~/types'

export function useReportesContables() {
  const { get } = useApi('yupana')

  async function balanceGeneral(profileId: string, fecha?: string): Promise<BalanceGeneral> {
    const res = await get<BalanceGeneral>(`/perfiles/${profileId}/reportes/balance-general`, { fecha, formato: 'json' })
    return (res as unknown as { data: BalanceGeneral }).data
  }

  async function balanceGeneralPdf(profileId: string, fecha?: string): Promise<ReporteContablePdfResult> {
    const res = await get<ReporteContablePdfResult>(`/perfiles/${profileId}/reportes/balance-general`, { fecha, formato: 'pdf' })
    return (res as unknown as { data: ReporteContablePdfResult }).data
  }

  async function estadoResultados(profileId: string, anio: string, mesDesde?: string, mesHasta?: string): Promise<EstadoResultados> {
    const res = await get<EstadoResultados>(`/perfiles/${profileId}/reportes/estado-resultados`, {
      anio,
      mes_desde: mesDesde,
      mes_hasta: mesHasta,
      formato: 'json',
    })
    return (res as unknown as { data: EstadoResultados }).data
  }

  async function estadoResultadosPdf(profileId: string, anio: string, mesDesde?: string, mesHasta?: string): Promise<ReporteContablePdfResult> {
    const res = await get<ReporteContablePdfResult>(`/perfiles/${profileId}/reportes/estado-resultados`, {
      anio,
      mes_desde: mesDesde,
      mes_hasta: mesHasta,
      formato: 'pdf',
    })
    return (res as unknown as { data: ReporteContablePdfResult }).data
  }

  async function flujoEfectivo(profileId: string, anio: string, mesDesde?: string, mesHasta?: string): Promise<EstadoFlujoEfectivo> {
    const res = await get<EstadoFlujoEfectivo>(`/perfiles/${profileId}/reportes/flujo-efectivo`, {
      anio,
      mes_desde: mesDesde,
      mes_hasta: mesHasta,
      formato: 'json',
    })
    return (res as unknown as { data: EstadoFlujoEfectivo }).data
  }

  async function flujoEfectivoPdf(profileId: string, anio: string, mesDesde?: string, mesHasta?: string): Promise<ReporteContablePdfResult> {
    const res = await get<ReporteContablePdfResult>(`/perfiles/${profileId}/reportes/flujo-efectivo`, {
      anio,
      mes_desde: mesDesde,
      mes_hasta: mesHasta,
      formato: 'pdf',
    })
    return (res as unknown as { data: ReporteContablePdfResult }).data
  }

  return { balanceGeneral, balanceGeneralPdf, estadoResultados, estadoResultadosPdf, flujoEfectivo, flujoEfectivoPdf }
}
