import type { PlanDetail, PlanDetailLimits } from '~/types'

export function usePlanDetails() {
  const { get, post, put } = useApi('collector')

  async function getByPlanId(planId: string): Promise<PlanDetail | null> {
    try {
      const res = await get<PlanDetail>(`/plans/${planId}/plan-details/plan`)
      return (res as unknown as { data: PlanDetail }).data ?? null
    } catch {
      // 404 = el plan todavía no tiene features configuradas.
      return null
    }
  }

  async function create(planId: string, data: { application_id: string, features: string[], limits?: PlanDetailLimits }): Promise<PlanDetail> {
    const res = await post<PlanDetail>(`/plans/${planId}/plan-details`, { ...data, limits: data.limits ?? {} })
    return (res as unknown as { data: PlanDetail }).data
  }

  async function update(planId: string, planDetailId: string, data: { features: string[] }): Promise<PlanDetail> {
    const res = await put<PlanDetail>(`/plans/${planId}/plan-details/${planDetailId}`, data)
    return (res as unknown as { data: PlanDetail }).data
  }

  return { getByPlanId, create, update }
}
