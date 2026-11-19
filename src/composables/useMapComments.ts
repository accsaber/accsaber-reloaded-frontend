import { useChat } from '@/composables/useChat'
import type { ChatMessageResponse } from '@/types/api/chat'
import type { Page } from '@/types/pagination'
import type { Ref } from 'vue'

const PAGE_SIZE = 50

export function useMapComments(difficultyId: Ref<string | undefined>) {
  const primed = new Map<string, Page<ChatMessageResponse>>()

  const chat = useChat(
    difficultyId,
    {
      load: async (id, params) => {
        const first = params.page === 0 ? primed.get(id) : undefined
        primed.delete(id)
        return first ?? (await import('@/api/maps')).getDifficultyComments(id, params)
      },
      send: async (id, req) => {
        const { postDifficultyComment } = await import('@/api/maps')
        const created = await postDifficultyComment(id, req)
        void refresh(id)
        return created
      },
    },
    PAGE_SIZE,
  )

  async function refresh(id: string) {
    const { getDifficultyComments } = await import('@/api/maps')
    const page = await getDifficultyComments(id, { page: 0, size: PAGE_SIZE }).catch(() => null)
    if (!page || id !== difficultyId.value) return
    for (const comment of [...page.content].reverse()) chat.ingest(comment)
  }

  function prime(id: string, firstPage: Page<ChatMessageResponse>) {
    primed.set(id, firstPage)
  }

  return { chat, prime }
}
