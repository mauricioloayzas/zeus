import type { TelegramAccount } from '~/types'

export function useTelegram() {
  const { get, post, del } = useApi('notifier')

  return {
    getAccount: async (profileId: string) => {
      const res = await get<TelegramAccount | null>(`/profiles/${profileId}/telegram/account`)
      return (res as unknown as { data: TelegramAccount | null }).data ?? null
    },

    connect: (profileId: string, data: { bot_token: string }) =>
      post<TelegramAccount>(`/profiles/${profileId}/telegram/connect`, data),

    disconnect: (profileId: string) => del<{ disconnected: boolean }>(`/profiles/${profileId}/telegram/account`),
  }
}
