import type { Subscription, SubscriptionStatusForm } from '~/types'

export function useSubscriptions() {
  const { get, patch } = useApi('collector')

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

  return { list, getByApplication, updateStatus }
}
