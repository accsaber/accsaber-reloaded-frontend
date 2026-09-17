import { useSocket } from '@/composables/useSocket'
import { useAuthStore } from '@/stores/auth'
import type { ChatMessageResponse } from '@/types/api/chat'
import { hashString } from '@/utils/constants'
import { isUuid } from '@/utils/mapRoute'
import { onScopeDispose, ref, type Ref } from 'vue'

export type PresenceAction = 'move' | 'select' | 'drag' | 'connect' | 'place' | 'edit'
export type PresenceKind = 'node' | 'barrier' | 'text' | null

export interface PresencePeer {
  userId: string
  name: string
  avatarUrl: string
  color: string
  x: number | null
  y: number | null
  action: PresenceAction
  targetId: string | null
  kind: PresenceKind
  tray: string | null
  typing: boolean
  lastSeen: number
  lastCursorAt: number
}

interface PresenceWire {
  type: string
  actorUserId?: string | null
  actorName?: string | null
  actorAvatarUrl?: string | null
  targetId?: string | null
  x?: number | null
  y?: number | null
  field?: string | null
  members?: { userId: string; name?: string | null; avatarUrl?: string | null }[] | null
  message?: ChatMessageResponse | null
}

const SEND_INTERVAL = 33
const HEARTBEAT_MS = 30000
const CURSOR_STALE_MS = 20000
const STALE_SWEEP_MS = 5000
const TYPING_SEND_INTERVAL = 2000
const TYPING_TTL = 3500

const ACTIONS: PresenceAction[] = ['move', 'select', 'drag', 'connect', 'place', 'edit']

export function colorForUser(userId: string): string {
  return `oklch(0.72 0.15 ${hashString(userId) % 360})`
}

function parseField(
  field: string | null | undefined,
): [PresenceAction, PresenceKind, string | null] {
  if (!field || field === 'off') return ['move', null, null]
  const [a, k, t] = field.split(':')
  const action = ACTIONS.includes(a as PresenceAction) ? (a as PresenceAction) : 'move'
  const kind = k === 'node' || k === 'barrier' || k === 'text' ? (k as PresenceKind) : null
  return [action, kind, t || null]
}

interface UseCampaignPresenceReturn {
  peers: Ref<PresencePeer[]>
  sendCursor: (
    x: number,
    y: number,
    action: PresenceAction,
    targetId: string | null,
    kind: PresenceKind,
    tray?: string | null,
  ) => void
  sendCursorOff: () => void
  sendChange: () => void
  sendTyping: () => void
  sendTypingStop: () => void
}

export function useCampaignPresence(
  campaignId: Ref<string | null | undefined>,
  active: Ref<boolean>,
  options: {
    onRemoteChange?: () => void
    onChat?: (message: ChatMessageResponse) => void
  } = {},
): UseCampaignPresenceReturn {
  const auth = useAuthStore()
  const peers = ref<PresencePeer[]>([])
  let remoteChangeTimer: ReturnType<typeof setTimeout> | null = null

  const peerMap = new Map<string, PresencePeer>()
  let staleSweep: ReturnType<typeof setInterval> | null = null

  let pending: {
    x: number
    y: number
    action: PresenceAction
    targetId: string | null
    kind: PresenceKind
    tray: string | null
  } | null = null
  let sendTimer: ReturnType<typeof setTimeout> | null = null
  let lastSentAt = 0
  let lastSentKey = ''
  const typingTimers = new Map<string, ReturnType<typeof setTimeout>>()
  let lastTypingSentAt = 0

  function selfId(): string | null {
    return auth.userId ?? null
  }

  function syncPeers() {
    const self = selfId()
    peers.value = [...peerMap.values()].filter((p) => p.userId !== self)
  }

  function upsertPeer(id: string, name?: string | null, avatarUrl?: string | null): PresencePeer {
    let peer = peerMap.get(id)
    if (!peer) {
      peer = {
        userId: id,
        name: name ?? 'Collaborator',
        avatarUrl: avatarUrl ?? '',
        color: colorForUser(id),
        x: null,
        y: null,
        action: 'move',
        targetId: null,
        kind: null,
        tray: null,
        typing: false,
        lastSeen: Date.now(),
        lastCursorAt: 0,
      }
      peerMap.set(id, peer)
    }
    if (name) peer.name = name
    if (avatarUrl) peer.avatarUrl = avatarUrl
    return peer
  }

  function clearTypingTimer(id: string) {
    const timer = typingTimers.get(id)
    if (timer) {
      clearTimeout(timer)
      typingTimers.delete(id)
    }
  }

  function markTyping(actorId: string, on: boolean) {
    const p = peerMap.get(actorId)
    if (!p) return
    clearTypingTimer(actorId)
    p.typing = on
    if (on) {
      typingTimers.set(
        actorId,
        setTimeout(() => {
          typingTimers.delete(actorId)
          const t = peerMap.get(actorId)
          if (t) {
            t.typing = false
            syncPeers()
          }
        }, TYPING_TTL),
      )
    }
  }

  function onMessage(msg: PresenceWire) {
    const type = msg.type
    if (!type) return

    if (type === 'presence_state') {
      const self = selfId()
      for (const m of msg.members ?? []) {
        if (m.userId === self) continue
        upsertPeer(m.userId, m.name, m.avatarUrl)
      }
      syncPeers()
      return
    }

    if (type === 'chat') {
      if (msg.message) options.onChat?.(msg.message)
      return
    }

    const actorId = msg.actorUserId ?? null
    if (!actorId || actorId === selfId()) return

    if (type === 'change') {
      if (remoteChangeTimer) clearTimeout(remoteChangeTimer)
      remoteChangeTimer = setTimeout(() => {
        remoteChangeTimer = null
        options.onRemoteChange?.()
      }, 500)
      return
    }

    if (type === 'presence_leave') {
      clearTypingTimer(actorId)
      peerMap.delete(actorId)
      syncPeers()
      return
    }

    if (type === 'typing') {
      const p = upsertPeer(actorId, msg.actorName, msg.actorAvatarUrl)
      p.lastSeen = Date.now()
      markTyping(actorId, msg.field !== 'off')
      syncPeers()
      return
    }

    const peer = upsertPeer(actorId, msg.actorName, msg.actorAvatarUrl)
    if (type !== 'presence_join') {
      const [action, kind, tray] = parseField(msg.field)
      peer.action = action
      peer.kind = kind
      peer.tray = tray
      peer.targetId = msg.targetId ?? null
      if (msg.x == null || msg.y == null || msg.field === 'off') {
        peer.x = null
        peer.y = null
      } else {
        peer.x = msg.x
        peer.y = msg.y
        peer.lastCursorAt = Date.now()
      }
    }
    peer.lastSeen = Date.now()
    syncPeers()
  }

  function stopStaleSweep() {
    if (staleSweep) {
      clearInterval(staleSweep)
      staleSweep = null
    }
  }

  function startStaleSweep() {
    stopStaleSweep()
    staleSweep = setInterval(() => {
      const now = Date.now()
      let changed = false
      for (const peer of peerMap.values()) {
        if (peer.x !== null && now - peer.lastCursorAt > CURSOR_STALE_MS) {
          peer.x = null
          peer.y = null
          changed = true
        }
      }
      if (changed) syncPeers()
    }, STALE_SWEEP_MS)
  }

  function clearRoom() {
    stopStaleSweep()
    for (const timer of typingTimers.values()) clearTimeout(timer)
    typingTimers.clear()
    peerMap.clear()
    syncPeers()
  }

  const { status, send } = useSocket<PresenceWire>({
    path: '/ws/campaigns/presence',
    auth: true,
    heartbeatMs: HEARTBEAT_MS,
    params: () => {
      const id = campaignId.value
      return active.value && id && isUuid(id) && auth.hasPlayerSession ? { campaignId: id } : null
    },
    onOpen: startStaleSweep,
    onMessage,
    onClose: clearRoom,
  })

  function sendJson(payload: Record<string, unknown>): boolean {
    return status.value === 'connected' && send(JSON.stringify(payload))
  }

  function flushCursor() {
    if (!pending) return
    const { x, y, action, targetId, kind, tray } = pending
    const field = `${action}:${kind ?? ''}:${tray ?? ''}`
    if (!sendJson({ type: 'cursor', x, y, targetId: targetId ?? null, field })) return
    lastSentAt = Date.now()
    lastSentKey = `${action}:${targetId ?? ''}`
    pending = null
  }

  function clearSendTimer() {
    if (sendTimer) {
      clearTimeout(sendTimer)
      sendTimer = null
    }
  }

  function sendCursor(
    x: number,
    y: number,
    action: PresenceAction,
    targetId: string | null,
    kind: PresenceKind,
    tray: string | null = null,
  ) {
    if (status.value !== 'connected') return
    pending = { x, y, action, targetId, kind, tray }
    const key = `${action}:${targetId ?? ''}`
    if (key !== lastSentKey) {
      clearSendTimer()
      flushCursor()
      return
    }
    const elapsed = Date.now() - lastSentAt
    if (elapsed >= SEND_INTERVAL) {
      flushCursor()
    } else if (!sendTimer) {
      sendTimer = setTimeout(() => {
        sendTimer = null
        flushCursor()
      }, SEND_INTERVAL - elapsed)
    }
  }

  function sendCursorOff() {
    pending = null
    clearSendTimer()
    lastSentKey = 'off'
    sendJson({ type: 'cursor', x: null, y: null, field: 'off' })
  }

  function sendChange() {
    sendJson({ type: 'change' })
  }

  function sendTyping() {
    const now = Date.now()
    if (now - lastTypingSentAt < TYPING_SEND_INTERVAL) return
    if (sendJson({ type: 'typing', field: 'on' })) lastTypingSentAt = now
  }

  function sendTypingStop() {
    lastTypingSentAt = 0
    sendJson({ type: 'typing', field: 'off' })
  }

  onScopeDispose(() => {
    clearSendTimer()
    if (remoteChangeTimer) {
      clearTimeout(remoteChangeTimer)
      remoteChangeTimer = null
    }
    clearRoom()
  })

  return { peers, sendCursor, sendCursorOff, sendChange, sendTyping, sendTypingStop }
}
