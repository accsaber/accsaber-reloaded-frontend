import { parseApiError } from '@/api/client'
import type { ChatMessageResponse, SendChatMessageRequest } from '@/types/api/chat'
import type { Page, PaginationParams } from '@/types/pagination'
import { isUuid } from '@/utils/mapRoute'
import { computed, ref, watch, type Ref } from 'vue'

const PAGE_SIZE = 20

export interface ChatChannelApi {
  load: (channelId: string, params: PaginationParams) => Promise<Page<ChatMessageResponse>>
  send: (channelId: string, req: SendChatMessageRequest) => Promise<ChatMessageResponse>
}

export function messageTimeMillis(createdAt: unknown): number {
  if (typeof createdAt === 'number' && Number.isFinite(createdAt)) {
    return createdAt < 1e12 ? createdAt * 1000 : createdAt
  }
  if (typeof createdAt === 'string') {
    const parsed = Date.parse(createdAt)
    if (!Number.isNaN(parsed)) return parsed
    const n = Number(createdAt)
    if (Number.isFinite(n) && n > 0) return n < 1e12 ? n * 1000 : n
  }
  return 0
}

export function useChat(channelId: Ref<string | null | undefined>, api: ChatChannelApi) {
  const byId = ref(new Map<string, ChatMessageResponse>())
  let seqById = new Map<string, number>()
  let headSeq = 0
  let tailSeq = 0

  function assignSeq(id: string, direction: 'append' | 'prepend') {
    if (seqById.has(id)) return
    seqById.set(id, direction === 'append' ? ++tailSeq : --headSeq)
  }

  function orderMessages(
    a: ChatMessageResponse,
    b: ChatMessageResponse,
  ): number {
    return (seqById.get(a.id) ?? 0) - (seqById.get(b.id) ?? 0)
  }

  const messages = computed(() => [...byId.value.values()].sort(orderMessages))

  const loading = ref(false)
  const loadingMore = ref(false)
  const sending = ref(false)
  const loaded = ref(false)
  const hasMore = ref(false)
  const error = ref<string | null>(null)
  const contentError = ref<string | null>(null)

  let nextPage = 0

  function addMessage(message: ChatMessageResponse, overwrite = false) {
    if (!overwrite && byId.value.has(message.id)) return
    assignSeq(message.id, 'append')
    const next = new Map(byId.value)
    next.set(message.id, message)
    byId.value = next
  }

  function addMany(list: ChatMessageResponse[]) {
    if (list.length === 0) return
    const next = new Map(byId.value)
    for (const m of list) {
      if (next.has(m.id)) continue
      assignSeq(m.id, 'prepend')
      next.set(m.id, m)
    }
    byId.value = next
  }

  function reset() {
    byId.value = new Map()
    seqById = new Map()
    headSeq = 0
    tailSeq = 0
    loaded.value = false
    hasMore.value = false
    error.value = null
    contentError.value = null
    nextPage = 0
  }

  function currentId(): string | null {
    const id = channelId.value
    return id && isUuid(id) ? id : null
  }

  async function loadHistory() {
    const id = currentId()
    if (!id || loaded.value || loading.value) return
    loading.value = true
    error.value = null
    try {
      const page = await api.load(id, { page: 0, size: PAGE_SIZE })
      addMany(page.content)
      hasMore.value = !page.last
      nextPage = 1
      loaded.value = true
    } catch (err) {
      error.value = parseApiError(err, 'Failed to load chat').message
    } finally {
      loading.value = false
    }
  }

  async function loadOlder() {
    const id = currentId()
    if (!id || !hasMore.value || loadingMore.value) return
    loadingMore.value = true
    error.value = null
    try {
      const page = await api.load(id, { page: nextPage, size: PAGE_SIZE })
      addMany(page.content)
      hasMore.value = !page.last
      nextPage += 1
    } catch (err) {
      error.value = parseApiError(err, 'Failed to load earlier messages').message
    } finally {
      loadingMore.value = false
    }
  }

  async function send(content: string): Promise<boolean> {
    const id = currentId()
    const trimmed = content.trim()
    if (!id || !trimmed || sending.value) return false
    sending.value = true
    contentError.value = null
    error.value = null
    try {
      const created = await api.send(id, { content: trimmed })
      addMessage(created, true)
      return true
    } catch (err) {
      const parsed = parseApiError(err, 'Failed to send message')
      const field = parsed.fieldErrors.find((f) => f.field === 'content')
      if (field) contentError.value = field.message
      else error.value = parsed.message
      return false
    } finally {
      sending.value = false
    }
  }

  function ingest(message: ChatMessageResponse) {
    addMessage(message)
  }

  watch(channelId, reset)

  return {
    messages,
    loading,
    loadingMore,
    sending,
    hasMore,
    error,
    contentError,
    loadHistory,
    loadOlder,
    send,
    ingest,
  }
}

export type UseChatReturn = ReturnType<typeof useChat>
