import type { ChatNotice } from '@/components/domain/ChatPanel.vue'
import { useChat } from '@/composables/useChat'
import { useSocket } from '@/composables/useSocket'
import type { ChatMessageResponse } from '@/types/api/chat'
import type { PlayerRef } from '@/types/api/common'
import { ref, type Ref } from 'vue'

const HEARTBEAT_MS = 30000
const MAX_NOTICES = 40

export interface PresenceNotice extends ChatNotice {
  player: PlayerRef
  online: boolean
}

interface ClanChatFrame {
  type: 'chat' | 'presence'
  channelId: string
  message?: ChatMessageResponse
  player?: PlayerRef
  online?: boolean
}

export function useClanChat(
  clanId: Ref<string | null>,
  enabled: Ref<boolean>,
  handlers: { onPresence: (playerId: string, online: boolean) => void; onRejected: () => void },
) {
  const chat = useChat(clanId, {
    load: (id, params) => import('@/api/clans').then((m) => m.getClanChat(id, params)),
    send: (id, req) => import('@/api/clans').then((m) => m.sendClanChatMessage(id, req)),
  })

  const notices = ref<PresenceNotice[]>([])
  let noticeSeq = 0

  function onFrame(frame: ClanChatFrame) {
    if (frame.channelId !== clanId.value) return
    if (frame.type === 'chat' && frame.message) {
      chat.ingest(frame.message)
      return
    }
    if (frame.type === 'presence' && frame.player && typeof frame.online === 'boolean') {
      handlers.onPresence(frame.player.id, frame.online)
      notices.value = [
        ...notices.value,
        { id: `presence-${++noticeSeq}`, at: Date.now(), player: frame.player, online: frame.online },
      ].slice(-MAX_NOTICES)
    }
  }

  const { status } = useSocket<ClanChatFrame>({
    path: '/ws/clans/chat',
    auth: true,
    heartbeatMs: HEARTBEAT_MS,
    params: () => (enabled.value && clanId.value ? { clanId: clanId.value } : null),
    onMessage: onFrame,
    onHalt: handlers.onRejected,
  })

  return { chat, notices, status }
}
