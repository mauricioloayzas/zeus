import type { WhatsAppAccount, WhatsAppTemplate, WhatsAppTemplateForm } from '~/types'

export function useWhatsApp() {
  const { get, post, del } = useApi('notifier')

  return {
    getAccount: async (profileId: string) => {
      const res = await get<WhatsAppAccount | null>(`/profiles/${profileId}/whatsapp/account`)
      return (res as unknown as { data: WhatsAppAccount | null }).data ?? null
    },

    disconnect: (profileId: string) => del<{ disconnected: boolean }>(`/profiles/${profileId}/whatsapp/account`),

    listTemplates: async (profileId: string) => {
      const res = await get<WhatsAppTemplate[]>(`/profiles/${profileId}/whatsapp/templates`)
      return (res as unknown as { data: WhatsAppTemplate[] }).data ?? []
    },

    createTemplate: (profileId: string, data: WhatsAppTemplateForm) =>
      post<WhatsAppTemplate>(`/profiles/${profileId}/whatsapp/templates`, data),

    deleteTemplate: (profileId: string, templateId: string) =>
      del<{ deleted: boolean }>(`/profiles/${profileId}/whatsapp/templates/${templateId}`),

    testTemplate: (profileId: string, templateId: string, to: string) =>
      post<unknown>(`/profiles/${profileId}/whatsapp/templates/${templateId}/test`, { to }),
  }
}
