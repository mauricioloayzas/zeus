import type { CajaHelperOption } from '~/types'

type HelperKey = 'tiposIdentificacion' | 'clienteStatuses' | 'puntoEmisionStatuses' | 'regimenes' | 'formasPago'

const HELPER_PATHS: Record<HelperKey, string> = {
  tiposIdentificacion: '/helper/tipos-identificacion',
  clienteStatuses: '/helper/cliente-statuses',
  puntoEmisionStatuses: '/helper/punto-emision-statuses',
  regimenes: '/helper/regimenes',
  formasPago: '/helper/payment-methods',
}

interface TaxCodesResponse {
  codigos_impuesto: CajaHelperOption[]
  porcentajes_iva: CajaHelperOption[]
}

export function useCajaHelpers() {
  const { get } = useApi('caja')

  const state = {
    tiposIdentificacion: useState<CajaHelperOption[]>('caja_tipos_identificacion', () => []),
    clienteStatuses: useState<CajaHelperOption[]>('caja_cliente_statuses', () => []),
    puntoEmisionStatuses: useState<CajaHelperOption[]>('caja_punto_emision_statuses', () => []),
    regimenes: useState<CajaHelperOption[]>('caja_regimenes', () => []),
    formasPago: useState<CajaHelperOption[]>('caja_formas_pago', () => []),
  }

  const codigosImpuesto = useState<CajaHelperOption[]>('caja_codigos_impuesto', () => [])
  const porcentajesIva = useState<CajaHelperOption[]>('caja_porcentajes_iva', () => [])

  async function ensure(key: HelperKey): Promise<CajaHelperOption[]> {
    if (state[key].value.length) return state[key].value
    try {
      const res = await get<CajaHelperOption[]>(HELPER_PATHS[key])
      state[key].value = res.data ?? []
    } catch (e: unknown) {
      console.error(`No se pudo cargar el helper "${key}" (${HELPER_PATHS[key]}):`, e)
      state[key].value = []
    }
    return state[key].value
  }

  async function ensureTaxCodes(): Promise<{ codigosImpuesto: CajaHelperOption[]; porcentajesIva: CajaHelperOption[] }> {
    if (!codigosImpuesto.value.length || !porcentajesIva.value.length) {
      try {
        const res = await get<TaxCodesResponse>('/helper/tax-codes')
        codigosImpuesto.value = res.data?.codigos_impuesto ?? []
        porcentajesIva.value = res.data?.porcentajes_iva ?? []
      } catch {
        codigosImpuesto.value = []
        porcentajesIva.value = []
      }
    }
    return { codigosImpuesto: codigosImpuesto.value, porcentajesIva: porcentajesIva.value }
  }

  return {
    ...state,
    codigosImpuesto,
    porcentajesIva,
    ensure,
    ensureTaxCodes,
  }
}
