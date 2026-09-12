import type { Plan, PlanForm } from '~/types'

export function usePlans() {
  const { get, post, put, patch, del } = useApi('collector')

  const base = (profileId: string) => `/profiles/${profileId}/plans`

  async function list(profileId: string): Promise<Plan[]> {
    const res = await get<Plan[]>(base(profileId))
    return (res as unknown as { data: Plan[] }).data ?? []
  }

  async function getOne(profileId: string, planId: string): Promise<Plan> {
    const res = await get<Plan>(`${base(profileId)}/${planId}`)
    return (res as unknown as { data: Plan }).data
  }

  async function create(profileId: string, data: PlanForm): Promise<Plan> {
    const res = await post<Plan>(base(profileId), data)
    return (res as unknown as { data: Plan }).data
  }

  async function update(profileId: string, planId: string, data: Partial<PlanForm>): Promise<Plan> {
    const res = await put<Plan>(`${base(profileId)}/${planId}`, data)
    return (res as unknown as { data: Plan }).data
  }

  async function updateStatus(profileId: string, planId: string, status: string): Promise<Plan> {
    const res = await patch<Plan>(`${base(profileId)}/${planId}/status`, { status })
    return (res as unknown as { data: Plan }).data
  }

  async function remove(profileId: string, planId: string): Promise<void> {
    await del(`${base(profileId)}/${planId}`)
  }

  return { list, getOne, create, update, updateStatus, remove }
}
