import type { Coupon, CouponForm, CuponPago } from '~/types'

// A diferencia de usePlans (scoped a un profile_id), los cupones son un recurso de
// plataforma — no cuelgan de ningún negocio puntual, por eso no llevan profile_id en la URL.
// El backend los gatea con ProfileAccessMiddleware::checkThisOriginAdmin (Owner/Administrator
// del origin), no con RBAC sobre un perfil.
export function useCoupons() {
  const { get, post, patch } = useApi('collector')

  async function list(applicationId: string): Promise<Coupon[]> {
    const res = await get<Coupon[]>('/coupons', { application_id: applicationId })
    return (res as unknown as { data: Coupon[] }).data ?? []
  }

  async function getOne(id: string): Promise<Coupon> {
    const res = await get<Coupon>(`/coupons/${id}`)
    return (res as unknown as { data: Coupon }).data
  }

  async function create(data: CouponForm): Promise<Coupon> {
    const res = await post<Coupon>('/coupons', data)
    return (res as unknown as { data: Coupon }).data
  }

  async function update(id: string, data: Partial<CouponForm>): Promise<Coupon> {
    const res = await patch<Coupon>(`/coupons/${id}`, data)
    return (res as unknown as { data: Coupon }).data
  }

  async function listPagos(couponId: string): Promise<CuponPago[]> {
    const res = await get<CuponPago[]>(`/coupons/${couponId}/pagos`)
    return (res as unknown as { data: CuponPago[] }).data ?? []
  }

  /** monto en dólares (no centavos) — el backend lo convierte. */
  async function registrarPago(couponId: string, monto: number, fecha?: string, nota?: string): Promise<CuponPago> {
    const res = await post<CuponPago>(`/coupons/${couponId}/pagos`, { monto, fecha, nota })
    return (res as unknown as { data: CuponPago }).data
  }

  return { list, getOne, create, update, listPagos, registrarPago }
}
