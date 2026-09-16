import type { Subscription, SubscriptionStatusForm, ScheduleAmountChangeForm, CreateAddonForm } from '~/types'

export function useSubscriptions() {
  const { get, patch, post } = useApi('collector')

  const base = (profileId: string) => `/profiles/${profileId}/subscriptions`

  async function list(profileId: string): Promise<Subscription[]> {
    const res = await get<Subscription[]>(base(profileId))
    return (res as unknown as { data: Subscription[] }).data ?? []
  }

  async function getByApplication(profileId: string, applicationId: string): Promise<Subscription[]> {
    const res = await get<Subscription[]>(`${base(profileId)}/application/${applicationId}`)
    return (res as unknown as { data: Subscription[] }).data ?? []
  }

  async function updateStatus(profileId: string, subscriptionId: string, body: SubscriptionStatusForm): Promise<Subscription> {
    const res = await patch<Subscription>(`${base(profileId)}/${subscriptionId}/status`, body)
    return (res as unknown as { data: Subscription }).data
  }

  /** amount en centavos. Pasar { amount: null } cancela un cambio programado existente. */
  async function scheduleAmountChange(profileId: string, subscriptionId: string, body: ScheduleAmountChangeForm): Promise<Subscription> {
    const res = await patch<Subscription>(`${base(profileId)}/${subscriptionId}/schedule-amount-change`, body)
    return (res as unknown as { data: Subscription }).data
  }

  /** Crea un plan adicional (is_addon) sobre una suscripción base ya activa, reusando su token. */
  async function createAddon(profileId: string, baseSubscriptionId: string, body: CreateAddonForm): Promise<Subscription> {
    const res = await post<Subscription>(`${base(profileId)}/${baseSubscriptionId}/addons`, body)
    return (res as unknown as { data: Subscription }).data
  }

  return { list, getByApplication, updateStatus, scheduleAmountChange, createAddon }
}
