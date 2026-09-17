import { useAuthStore } from '@/stores/auth'
import type { ConnectionStatus } from '@/types/display'
import { parseSocketJson, wsOrigin } from '@/utils/ws'
import { computed, onScopeDispose, ref, toValue, watch, type MaybeRefOrGetter, type Ref } from 'vue'

const INITIAL_RETRY_MS = 1000
const MAX_RETRY_MS = 30000
const CLOSE_UNAUTHORIZED = 4401
const CLOSE_FORBIDDEN = 4403

export type SocketParams = Record<string, string>

export interface SocketOptions<T> {
  path: string
  params?: MaybeRefOrGetter<SocketParams | null | undefined>
  auth?: boolean
  autoConnect?: boolean
  heartbeatMs?: number
  onOpen?: () => void
  onMessage?: (data: T) => void
  onReconnect?: () => void
  onClose?: () => void
}

export interface UseSocketReturn {
  status: Ref<ConnectionStatus>
  halted: Ref<boolean>
  connect: () => void
  disconnect: () => void
  send: (data: string) => boolean
}

function buildUrl(path: string, params: SocketParams, token: string | null): string {
  const query = new URLSearchParams(params)
  if (token) query.set('token', token)
  const qs = query.toString()
  return `${wsOrigin()}${path}${qs ? `?${qs}` : ''}`
}

export function useSocket<T = unknown>(options: SocketOptions<T>): UseSocketReturn {
  const auth = useAuthStore()
  const status = ref<ConnectionStatus>('disconnected')
  const halted = ref(false)
  const enabled = ref(options.autoConnect ?? true)

  let ws: WebSocket | null = null
  let generation = 0
  let retryMs = INITIAL_RETRY_MS
  let retryTimeout: ReturnType<typeof setTimeout> | null = null
  let heartbeat: ReturnType<typeof setInterval> | null = null
  let refreshedOnce = false
  let dropped = false

  const roomKey = computed(() => {
    const params = toValue(options.params)
    return enabled.value && params !== null ? JSON.stringify(params ?? {}) : null
  })

  function send(data: string): boolean {
    if (ws?.readyState !== WebSocket.OPEN) return false
    try {
      ws.send(data)
      return true
    } catch {
      ws.close()
      return false
    }
  }

  function stopHeartbeat() {
    if (heartbeat) {
      clearInterval(heartbeat)
      heartbeat = null
    }
  }

  function startHeartbeat() {
    stopHeartbeat()
    if (!options.heartbeatMs) return
    heartbeat = setInterval(() => send('ping'), options.heartbeatMs)
  }

  function clearRetry() {
    if (retryTimeout) {
      clearTimeout(retryTimeout)
      retryTimeout = null
    }
  }

  function scheduleReconnect() {
    if (retryTimeout || halted.value) return
    status.value = 'reconnecting'
    retryTimeout = setTimeout(() => {
      retryTimeout = null
      void connect()
    }, retryMs)
    retryMs = Math.min(retryMs * 2, MAX_RETRY_MS)
  }

  function halt() {
    halted.value = true
    status.value = 'disconnected'
  }

  async function resolveToken(myGeneration: number): Promise<string | null | undefined> {
    if (!options.auth) return null
    if (!auth.hasPlayerSession) return undefined
    if (auth.isPlayerTokenExpiringSoon) await auth.refreshPlayerSession()
    if (myGeneration !== generation) return undefined
    return auth.accessToken ?? undefined
  }

  async function connect() {
    if (ws || halted.value || roomKey.value === null) return
    const myGeneration = generation
    const token = await resolveToken(myGeneration)
    if (token === undefined || myGeneration !== generation || ws) return

    const socket = new WebSocket(buildUrl(options.path, toValue(options.params) ?? {}, token))
    ws = socket

    socket.addEventListener('open', () => {
      if (socket !== ws) {
        socket.close()
        return
      }
      retryMs = INITIAL_RETRY_MS
      refreshedOnce = false
      status.value = 'connected'
      startHeartbeat()
      options.onOpen?.()
      if (dropped) {
        dropped = false
        options.onReconnect?.()
      }
    })

    socket.addEventListener('message', (event) => {
      if (socket !== ws || !options.onMessage) return
      const parsed = parseSocketJson<T>(event.data)
      if (parsed !== null) options.onMessage(parsed)
    })

    socket.addEventListener('close', (event) => {
      if (socket !== ws) return
      ws = null
      stopHeartbeat()
      options.onClose?.()
      if (myGeneration !== generation) return
      dropped = true
      if (event.code === CLOSE_FORBIDDEN) {
        halt()
        return
      }
      if (event.code === CLOSE_UNAUTHORIZED) {
        if (refreshedOnce) {
          halt()
          return
        }
        refreshedOnce = true
        status.value = 'reconnecting'
        void auth.refreshPlayerSession().then(() => {
          if (myGeneration === generation) void connect()
        })
        return
      }
      scheduleReconnect()
    })

    socket.addEventListener('error', () => {
      socket.close()
    })
  }

  function teardown() {
    generation++
    clearRetry()
    stopHeartbeat()
    if (ws) {
      const socket = ws
      ws = null
      socket.close()
      options.onClose?.()
    }
    retryMs = INITIAL_RETRY_MS
    refreshedOnce = false
    dropped = false
    halted.value = false
    status.value = 'disconnected'
  }

  watch(
    roomKey,
    (key) => {
      teardown()
      if (key !== null) void connect()
    },
    { immediate: true },
  )

  onScopeDispose(teardown)

  return {
    status,
    halted,
    connect: () => {
      enabled.value = true
    },
    disconnect: () => {
      enabled.value = false
    },
    send,
  }
}
