import { useChat } from '@/composables/useChat'
import type { Ref } from 'vue'

const FIRST_PAGE = { page: 0, size: 20 }

export function useMapComments(difficultyId: Ref<string | undefined>) {
  const chat = useChat(difficultyId, {
    load: async (id, params) => (await import('@/api/maps')).getDifficultyComments(id, params),
    send: async (id, req) => {
      const { postDifficultyComment } = await import('@/api/maps')
      const created = await postDifficultyComment(id, req)
      void refresh(id)
      return created
    },
  })

  async function refresh(id: string) {
    const { getDifficultyComments } = await import('@/api/maps')
    const page = await getDifficultyComments(id, FIRST_PAGE).catch(() => null)
    if (!page || id !== difficultyId.value) return
    for (const comment of [...page.content].reverse()) chat.ingest(comment)
  }

  return chat
}
