import type {
  RoadmapEdge,
  RoadmapStage,
  RoadmapTools,
} from '@/components/domain/CampaignRoadmap.vue'
import type {
  PresenceAction,
  PresenceKind,
  PresencePeer,
} from '@/composables/useCampaignPresence'
import { computed, onUnmounted, ref, shallowRef, watch } from 'vue'

export interface RoadmapCursorPayload {
  x: number
  y: number
  action: PresenceAction
  targetId: string | null
  kind: PresenceKind
  tray: string | null
}

interface RoadmapPresenceOptions {
  peers: () => PresencePeer[]
  activeTray: () => string | null
  onCursor: (payload: RoadmapCursorPayload) => void
  onCursorOff: () => void
}

interface RoadmapToolsOptions {
  editable: () => boolean
  mode: () => 'drag' | 'connect' | 'select'
  barrierPlacement: () => boolean
  selectedId: () => string | null
  onConnect: (edge: RoadmapEdge) => void
  onDisconnect: (edge: RoadmapEdge) => void
  onPlaceBarrier: (edge: RoadmapEdge) => void
  presence?: RoadmapPresenceOptions
}

type Point = { x: number; y: number }
type RemoteDrag = { cx: number; cy: number; color: string }

const EDGE_HIT_SELECTOR = '.campaign-roadmap__edge-hit'
const EDGE_REMOVE_SELECTOR = '.campaign-roadmap__edge-x'

function usePeerCursors(stage: () => RoadmapStage | null, peers: () => PresencePeer[]) {
  const cursorDisplay = ref(new Map<string, Point>())
  const remoteDragById = ref(new Map<string, RemoteDrag>())
  let cursorRaf: number | null = null

  function easeCursors(): boolean {
    const disp = cursorDisplay.value
    const alive = new Set<string>()
    let changed = false
    for (const peer of peers()) {
      if (peer.x == null || peer.y == null) continue
      alive.add(peer.userId)
      const cur = disp.get(peer.userId)
      if (!cur) {
        disp.set(peer.userId, { x: peer.x, y: peer.y })
        changed = true
        continue
      }
      const nx = cur.x + (peer.x - cur.x) * 0.28
      const ny = cur.y + (peer.y - cur.y) * 0.28
      if (Math.abs(nx - cur.x) > 0.02 || Math.abs(ny - cur.y) > 0.02) {
        cur.x = nx
        cur.y = ny
        changed = true
      }
    }
    for (const id of [...disp.keys()]) {
      if (!alive.has(id)) {
        disp.delete(id)
        changed = true
      }
    }
    if (changed) cursorDisplay.value = new Map(disp)
    return changed
  }

  function trackRemoteDrags(): boolean {
    const disp = cursorDisplay.value
    let drag: Map<string, RemoteDrag> | null = null
    for (const peer of peers()) {
      if (peer.action !== 'drag' || !peer.targetId || peer.x == null || peer.y == null) continue
      const d = disp.get(peer.userId)
      if (!d) continue
      const prev = remoteDragById.value.get(peer.targetId)
      if (!prev || prev.cx !== d.x || prev.cy !== d.y) {
        drag ??= new Map(remoteDragById.value)
        drag.set(peer.targetId, { cx: d.x, cy: d.y, color: peer.color })
      }
    }
    if (drag) remoteDragById.value = drag
    return !!drag
  }

  function tickCursors() {
    const changed = easeCursors()
    const dragged = trackRemoteDrags()
    cursorRaf = changed || dragged ? requestAnimationFrame(tickCursors) : null
  }

  function stopCursorLoop() {
    if (cursorRaf != null) {
      cancelAnimationFrame(cursorRaf)
      cursorRaf = null
    }
  }

  watch(
    peers,
    (list) => {
      if (list.length > 0) {
        if (cursorRaf == null) cursorRaf = requestAnimationFrame(tickCursors)
        return
      }
      stopCursorLoop()
      if (cursorDisplay.value.size) cursorDisplay.value = new Map()
      if (remoteDragById.value.size) remoteDragById.value = new Map()
    },
    { immediate: true, deep: true },
  )

  onUnmounted(stopCursorLoop)

  const cursors = computed(() => {
    const out: Array<{ peer: PresencePeer; x: number; y: number }> = []
    for (const peer of peers()) {
      const d = cursorDisplay.value.get(peer.userId)
      if (d) out.push({ peer, x: d.x, y: d.y })
    }
    return out
  })

  const remoteConnects = computed(() => {
    const vertices = stage()?.vertexById.value
    const out: Array<{ key: string; x1: number; y1: number; x2: number; y2: number; color: string }> =
      []
    for (const peer of peers()) {
      if (peer.action !== 'connect' || !peer.targetId) continue
      const from = vertices?.get(peer.targetId)
      const to = cursorDisplay.value.get(peer.userId)
      if (from && to) {
        out.push({ key: peer.userId, x1: from.cx, y1: from.cy, x2: to.x, y2: to.y, color: peer.color })
      }
    }
    return out
  })

  const remoteRings = computed(() => {
    const vertices = stage()?.vertexById.value
    const out: Array<{ key: string; cx: number; cy: number; color: string }> = []
    for (const peer of peers()) {
      if (!peer.targetId || peer.action === 'move') continue
      const v = vertices?.get(peer.targetId)
      if (v) out.push({ key: `${peer.userId}:${peer.targetId}`, cx: v.cx, cy: v.cy, color: peer.color })
    }
    return out
  })

  function clearRemoteDrags() {
    if (remoteDragById.value.size) remoteDragById.value = new Map()
  }

  return { remoteDragById, cursors, remoteConnects, remoteRings, clearRemoteDrags }
}

export function useCampaignRoadmapTools(opts: RoadmapToolsOptions) {
  const stage = shallowRef<RoadmapStage | null>(null)
  const connectFromId = ref<string | null>(null)
  const connectPoint = ref<Point | null>(null)
  const connectTargetId = ref<string | null>(null)

  const presence = opts.presence
  const peerCursors = presence ? usePeerCursors(() => stage.value, presence.peers) : null

  function attach(next: RoadmapStage | null) {
    stage.value = next
  }

  let lastPresence = { x: 0, y: 0, has: false }

  function presenceTarget(s: RoadmapStage): { action: PresenceAction; targetId: string | null } {
    if (opts.barrierPlacement()) return { action: 'place', targetId: null }
    if (connectFromId.value) {
      return { action: 'connect', targetId: connectTargetId.value ?? connectFromId.value }
    }
    if (s.draggingId.value) return { action: 'drag', targetId: s.draggingId.value }
    if (s.marquee.value) return { action: 'select', targetId: null }
    if (s.hoverId.value) return { action: 'select', targetId: s.hoverId.value }
    const selected = opts.selectedId()
    if (selected) return { action: 'edit', targetId: selected }
    return { action: 'move', targetId: null }
  }

  function emitPresence(x: number, y: number) {
    const s = stage.value
    if (!presence || !s || !opts.editable()) return
    lastPresence = { x, y, has: true }
    const { action, targetId } = presenceTarget(s)
    presence.onCursor({
      x,
      y,
      action,
      targetId,
      kind: targetId ? s.kindOf(targetId) : null,
      tray: presence.activeTray() ?? null,
    })
  }

  if (presence) {
    watch(
      [
        () => stage.value?.draggingId.value,
        connectFromId,
        opts.barrierPlacement,
        opts.selectedId,
        presence.activeTray,
      ],
      () => {
        if (lastPresence.has) emitPresence(lastPresence.x, lastPresence.y)
      },
    )
  }

  function pointerDown(e: PointerEvent, nodeId: string | null): boolean {
    const s = stage.value
    if (!s || !nodeId || !opts.editable() || opts.mode() !== 'connect') return false
    connectFromId.value = nodeId
    connectPoint.value = s.clientToContent(e.clientX, e.clientY)
    return true
  }

  function pointerMove(e: PointerEvent) {
    const s = stage.value
    if (!s || (!opts.editable() && !connectFromId.value)) return
    const p = s.clientToContent(e.clientX, e.clientY)
    emitPresence(p.x, p.y)
    if (!connectFromId.value) return
    connectPoint.value = p
    const hover = s.nodeIdAtPoint(e.clientX, e.clientY)
    connectTargetId.value = hover && hover !== connectFromId.value ? hover : null
  }

  function pointerLeave() {
    if (!opts.editable()) return
    lastPresence.has = false
    presence?.onCursorOff()
  }

  function release(fromId: string, clientX: number, clientY: number, target: EventTarget | null) {
    const s = stage.value
    const toId =
      connectTargetId.value ?? s?.nodeIdAtPoint(clientX, clientY) ?? s?.nodeIdFromEvent(target)
    connectFromId.value = null
    connectPoint.value = null
    connectTargetId.value = null
    if (toId && toId !== fromId) opts.onConnect({ fromId, toId })
  }

  function ignorePointer(e: PointerEvent): boolean {
    const target = e.target as Element | null
    if (target?.closest?.(EDGE_REMOVE_SELECTOR)) return true
    return opts.barrierPlacement() && !!target?.closest?.(EDGE_HIT_SELECTOR)
  }

  function edgeAt(clientX: number, clientY: number): RoadmapEdge | null {
    if (typeof document === 'undefined') return null
    const hit = document.elementFromPoint(clientX, clientY)
    const line = hit?.closest(EDGE_HIT_SELECTOR) as SVGElement | null
    const fromId = line?.dataset.edgeFrom
    const toId = line?.dataset.edgeTo
    return fromId && toId ? { fromId, toId } : null
  }

  function clickEdge(edge: RoadmapEdge) {
    if (opts.barrierPlacement()) opts.onPlaceBarrier({ fromId: edge.fromId, toId: edge.toId })
  }

  function disconnect(edge: RoadmapEdge) {
    opts.onDisconnect({ fromId: edge.fromId, toId: edge.toId })
  }

  const connectLine = computed(() => {
    const fromId = connectFromId.value
    const to = connectPoint.value
    const from = fromId ? stage.value?.vertexById.value.get(fromId) : null
    return from && to ? { x1: from.cx, y1: from.cy, x2: to.x, y2: to.y } : null
  })

  const contract: RoadmapTools = {
    attach,
    connectTargetId,
    positionOf: (id) => peerCursors?.remoteDragById.value.get(id),
    ignorePointer,
    pointerDown,
    pointerMove,
    pointerLeave,
    release,
    edgeAt,
    contentChanged: () => peerCursors?.clearRemoteDrags(),
  }

  return {
    ...contract,
    stage,
    editable: opts.editable,
    placing: opts.barrierPlacement,
    connectLine,
    clickEdge,
    disconnect,
    peerCursors,
  }
}

export type CampaignRoadmapTools = ReturnType<typeof useCampaignRoadmapTools>
