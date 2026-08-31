import {
  computed,
  onMounted,
  onUnmounted,
  ref,
  type ComputedRef,
  type Ref,
} from 'vue'
import {
  hexProjection,
  type ContentRect,
  type GridProjection,
  type NodeLayout,
} from '@/utils/stageLayout'

const CLICK_THRESHOLD_PX = 4

export interface StageMarquee {
  x0: number
  y0: number
  x1: number
  y1: number
}

export interface StageMovePayload {
  id: string
  positionX: number
  positionY: number
}

export type StageGesture =
  | { kind: 'nodeClick'; id: string; shiftKey: boolean }
  | { kind: 'nodeDrag'; payload: StageMovePayload }
  | { kind: 'nodeDragMany'; payloads: StageMovePayload[] }
  | { kind: 'marquee'; ids: string[]; additive: boolean }
  | { kind: 'marqueeEmpty'; additive: boolean; clientX: number; clientY: number }
  | { kind: 'backgroundClick'; content: { x: number; y: number }; clientX: number; clientY: number }
  | { kind: 'customRelease'; fromId: string; clientX: number; clientY: number; target: EventTarget | null }

export interface StageInteractionOptions {
  contentBounds: ComputedRef<ContentRect>
  vertices: ComputedRef<NodeLayout[]>
  unit: ComputedRef<number>
  projection?: GridProjection
  defaultScale?: ComputedRef<number>
  minScale?: number
  maxScale?: number
  editable?: ComputedRef<boolean>
  marqueeEnabled?: ComputedRef<boolean>
  dragEnabled?: ComputedRef<boolean>
  snap?: ComputedRef<boolean>
  groupIds?: ComputedRef<string[]>
  ignoreSelectors?: string[]
  shouldIgnore?: (event: PointerEvent) => boolean
  nodeSelector?: string
  interceptPointerDown?: (event: PointerEvent, nodeId: string | null) => boolean
  onPointerMoveExtra?: (event: PointerEvent) => void
  onPointerLeaveExtra?: () => void
  onGesture?: (gesture: StageGesture) => void
}

interface DragState {
  x: number
  y: number
  tx: number
  ty: number
  nodeId: string | null
  startCx: number
  startCy: number
  moved: boolean
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  )
}

export function useStageInteraction(
  stage: Ref<HTMLElement | SVGElement | null>,
  options: StageInteractionOptions,
) {
  const projection = options.projection ?? hexProjection
  const nodeSelector = options.nodeSelector ?? '[data-node]'
  const maxScale = options.maxScale ?? 2.5
  const comfortableMinScale = options.minScale ?? 0.4

  const stageWidth = ref(800)
  const stageHeight = ref(560)
  const scale = ref(1)
  const translateX = ref(0)
  const translateY = ref(0)

  const marquee = ref<StageMarquee | null>(null)
  const dragOverlay = ref(new Map<string, { cx: number; cy: number }>())
  const draggingNodeId = ref<string | null>(null)
  const altHeld = ref(false)

  let dragStart: DragState | null = null
  let groupDragStart: Map<string, { cx: number; cy: number }> | null = null
  let marqueeStart: { x: number; y: number; additive: boolean } | null = null
  let customFromId: string | null = null
  let suppressClick = false
  let resizeObserver: ResizeObserver | null = null

  const vertexById = computed(() => {
    const map = new Map<string, NodeLayout>()
    for (const v of options.vertices.value) map.set(v.id, v)
    return map
  })

  const fitScale = computed(() => {
    const b = options.contentBounds.value
    if (b.width <= 0 || b.height <= 0 || stageWidth.value <= 0 || stageHeight.value <= 0) return 1
    return Math.min(stageWidth.value / b.width, stageHeight.value / b.height)
  })

  const minScale = computed(() => Math.min(comfortableMinScale, fitScale.value))

  const transformStyle = computed(
    () => `translate(${translateX.value} ${translateY.value}) scale(${scale.value})`,
  )

  function measure() {
    const el = stage.value
    if (!el) return
    stageWidth.value = el.clientWidth
    stageHeight.value = el.clientHeight
  }

  function clampPan() {
    const b = options.contentBounds.value
    const pad = 80
    const minTx = -(b.x + b.width) * scale.value + pad
    const maxTx = stageWidth.value - b.x * scale.value - pad
    const minTy = -(b.y + b.height) * scale.value + pad
    const maxTy = stageHeight.value - b.y * scale.value - pad
    translateX.value = Math.min(Math.max(translateX.value, minTx), maxTx)
    translateY.value = Math.min(Math.max(translateY.value, minTy), maxTy)
  }

  function fitToContent() {
    if (!stage.value) return
    measure()
    const b = options.contentBounds.value
    if (b.width === 0 || b.height === 0) return
    const s = Math.min(maxScale, fitScale.value)
    scale.value = s
    translateX.value = stageWidth.value / 2 - (b.x + b.width / 2) * s
    translateY.value = stageHeight.value / 2 - (b.y + b.height / 2) * s
  }

  function zoomAround(viewX: number, viewY: number, next: number) {
    const clamped = Math.max(minScale.value, Math.min(maxScale, next))
    const ratio = clamped / scale.value
    translateX.value = viewX - (viewX - translateX.value) * ratio
    translateY.value = viewY - (viewY - translateY.value) * ratio
    scale.value = clamped
    clampPan()
  }

  function onWheel(e: WheelEvent) {
    if (!stage.value) return
    e.preventDefault()
    const rect = stage.value.getBoundingClientRect()
    const factor = Math.exp(-e.deltaY * 0.0015)
    zoomAround(e.clientX - rect.left, e.clientY - rect.top, scale.value * factor)
  }

  function adjustZoom(factor: number) {
    if (!stage.value) return
    zoomAround(stageWidth.value / 2, stageHeight.value / 2, scale.value * factor)
  }

  function focusNode(id: string, targetScale?: number) {
    const n = vertexById.value.get(id)
    if (!n || !stage.value) return
    focusPoint(n.cx, n.cy, targetScale)
  }

  function focusPoint(cx: number, cy: number, targetScale?: number) {
    const s = targetScale ?? Math.max(scale.value, options.defaultScale?.value ?? 1)
    const clamped = Math.max(minScale.value, Math.min(maxScale, s))
    translateX.value = stageWidth.value / 2 - cx * clamped
    translateY.value = stageHeight.value / 2 - cy * clamped
    scale.value = clamped
    clampPan()
  }

  function revealPoint(cx: number, cy: number, margin = 80) {
    const vx = cx * scale.value + translateX.value
    const vy = cy * scale.value + translateY.value
    if (vx < margin) translateX.value += margin - vx
    else if (vx > stageWidth.value - margin) translateX.value -= vx - (stageWidth.value - margin)
    if (vy < margin) translateY.value += margin - vy
    else if (vy > stageHeight.value - margin) translateY.value -= vy - (stageHeight.value - margin)
    clampPan()
  }

  function clientToContent(clientX: number, clientY: number) {
    if (!stage.value) return { x: 0, y: 0 }
    const rect = stage.value.getBoundingClientRect()
    return {
      x: (clientX - rect.left - translateX.value) / scale.value,
      y: (clientY - rect.top - translateY.value) / scale.value,
    }
  }

  function viewCenterCell() {
    const cx = (stageWidth.value / 2 - translateX.value) / scale.value
    const cy = (stageHeight.value / 2 - translateY.value) / scale.value
    return projection.toGrid(cx, cy, options.unit.value, true)
  }

  function nodeIdFromEvent(target: EventTarget | null): string | null {
    if (!target) return null
    const el = (target as Element).closest?.(nodeSelector) as HTMLElement | null
    return el?.dataset.id ?? null
  }

  function nodeIdAtPoint(clientX: number, clientY: number): string | null {
    if (typeof document === 'undefined') return null
    const hit = document.elementFromPoint(clientX, clientY)
    const node = hit?.closest(nodeSelector) as HTMLElement | null
    return node?.dataset.id ?? null
  }

  function pointerToGrid(cx: number, cy: number) {
    return projection.toGrid(cx, cy, options.unit.value, options.snap?.value ?? false)
  }

  function gridToContent(positionX: number, positionY: number) {
    return projection.toContent(positionX, positionY, options.unit.value)
  }

  function setOverlay(id: string, cx: number, cy: number) {
    dragOverlay.value.set(id, { cx, cy })
    dragOverlay.value = new Map(dragOverlay.value)
  }

  function clearOverlay(id: string) {
    dragOverlay.value.delete(id)
    dragOverlay.value = new Map(dragOverlay.value)
    draggingNodeId.value = null
  }

  function settleOverlay(
    nodeId: string,
    from: { cx: number; cy: number },
    to: { cx: number; cy: number },
  ) {
    if (prefersReducedMotion()) {
      clearOverlay(nodeId)
      return
    }
    const startTime = performance.now()
    const duration = 180
    const animate = (now: number) => {
      const t = Math.min((now - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setOverlay(nodeId, from.cx + (to.cx - from.cx) * eased, from.cy + (to.cy - from.cy) * eased)
      if (t < 1) requestAnimationFrame(animate)
      else clearOverlay(nodeId)
    }
    requestAnimationFrame(animate)
  }

  function applyOverlay<T extends NodeLayout>(n: T): T {
    const over = dragOverlay.value.get(n.id)
    return over ? { ...n, cx: over.cx, cy: over.cy } : n
  }

  function emitGesture(gesture: StageGesture) {
    options.onGesture?.(gesture)
  }

  function beginDrag(e: PointerEvent, nodeId: string | null, node: NodeLayout | null) {
    dragStart = {
      x: e.clientX,
      y: e.clientY,
      tx: translateX.value,
      ty: translateY.value,
      nodeId,
      startCx: node?.cx ?? 0,
      startCy: node?.cy ?? 0,
      moved: false,
    }
  }

  function capture(e: PointerEvent, on: boolean) {
    const el = e.currentTarget as HTMLElement | null
    if (!el) return
    try {
      if (on) el.setPointerCapture(e.pointerId)
      else el.releasePointerCapture(e.pointerId)
    } catch {
      return
    }
  }

  function onPointerDown(e: PointerEvent) {
    if (e.button !== 0 && e.button !== 1) return
    altHeld.value = e.altKey
    const target = e.target as Element | null
    for (const sel of options.ignoreSelectors ?? []) {
      if (target?.closest?.(sel)) return
    }
    if (options.shouldIgnore?.(e)) return

    const nodeId = nodeIdFromEvent(e.target)
    const node = nodeId ? (vertexById.value.get(nodeId) ?? null) : null
    capture(e, true)

    if (options.interceptPointerDown?.(e, nodeId)) {
      customFromId = nodeId
      beginDrag(e, nodeId, node)
      return
    }

    if (nodeId && options.editable?.value && options.dragEnabled?.value) {
      const group = options.groupIds?.value ?? []
      if (group.length > 1 && group.includes(nodeId)) {
        groupDragStart = new Map()
        for (const id of group) {
          const gn = vertexById.value.get(id)
          if (gn) groupDragStart.set(id, { cx: gn.cx, cy: gn.cy })
        }
      } else {
        groupDragStart = null
      }
      beginDrag(e, nodeId, node)
      return
    }

    if (!nodeId && options.editable?.value && options.marqueeEnabled?.value) {
      const p = clientToContent(e.clientX, e.clientY)
      marqueeStart = { x: p.x, y: p.y, additive: e.shiftKey }
      marquee.value = { x0: p.x, y0: p.y, x1: p.x, y1: p.y }
      beginDrag(e, null, null)
      return
    }

    beginDrag(e, nodeId, node)
  }

  function onPointerMove(e: PointerEvent) {
    altHeld.value = e.altKey
    options.onPointerMoveExtra?.(e)
    if (!dragStart) return

    const dx = e.clientX - dragStart.x
    const dy = e.clientY - dragStart.y
    if (!dragStart.moved && Math.hypot(dx, dy) > CLICK_THRESHOLD_PX) dragStart.moved = true

    if (customFromId) return

    if (marqueeStart) {
      const p = clientToContent(e.clientX, e.clientY)
      marquee.value = {
        x0: Math.min(marqueeStart.x, p.x),
        y0: Math.min(marqueeStart.y, p.y),
        x1: Math.max(marqueeStart.x, p.x),
        y1: Math.max(marqueeStart.y, p.y),
      }
      return
    }

    if (dragStart.nodeId && options.editable?.value && options.dragEnabled?.value) {
      if (!dragStart.moved) return
      const ratio = 1 / scale.value
      if (groupDragStart) {
        for (const [id, start] of groupDragStart) {
          setOverlay(id, start.cx + dx * ratio, start.cy + dy * ratio)
        }
      } else {
        setOverlay(dragStart.nodeId, dragStart.startCx + dx * ratio, dragStart.startCy + dy * ratio)
      }
      draggingNodeId.value = dragStart.nodeId
      return
    }

    if (dragStart.nodeId) return

    translateX.value = dragStart.tx + dx
    translateY.value = dragStart.ty + dy
  }

  function finishGroupDrag(nodeId: string) {
    if (!groupDragStart) return false
    const draggedFinal = dragOverlay.value.get(nodeId)
    const start = groupDragStart.get(nodeId)
    if (!draggedFinal || !start) {
      draggingNodeId.value = null
      return false
    }
    const lead = pointerToGrid(draggedFinal.cx, draggedFinal.cy)
    const leadPoint = gridToContent(lead.positionX, lead.positionY)
    const shiftX = leadPoint.cx - start.cx
    const shiftY = leadPoint.cy - start.cy
    const payloads: StageMovePayload[] = []
    for (const [id, st] of groupDragStart) {
      const targetCx = st.cx + shiftX
      const targetCy = st.cy + shiftY
      const grid = pointerToGrid(targetCx, targetCy)
      payloads.push({ id, positionX: grid.positionX, positionY: grid.positionY })
      settleOverlay(
        id,
        dragOverlay.value.get(id) ?? { cx: targetCx, cy: targetCy },
        gridToContent(grid.positionX, grid.positionY),
      )
    }
    emitGesture({ kind: 'nodeDragMany', payloads })
    return true
  }

  function finishMarquee(moved: boolean, e: PointerEvent) {
    const rect = marquee.value
    const additive = marqueeStart?.additive ?? false
    marquee.value = null
    marqueeStart = null
    if (moved) suppressClick = true
    if (moved && rect) {
      const ids = options.vertices.value
        .map(applyOverlay)
        .filter((n) => n.cx >= rect.x0 && n.cx <= rect.x1 && n.cy >= rect.y0 && n.cy <= rect.y1)
        .map((n) => n.id)
      emitGesture({ kind: 'marquee', ids, additive })
    } else {
      emitGesture({ kind: 'marqueeEmpty', additive, clientX: e.clientX, clientY: e.clientY })
    }
  }

  function onPointerUp(e: PointerEvent) {
    if (!dragStart) return
    altHeld.value = e.altKey
    const { nodeId, moved } = dragStart
    capture(e, false)
    clampPan()

    if (customFromId) {
      const fromId = customFromId
      customFromId = null
      dragStart = null
      suppressClick = true
      emitGesture({ kind: 'customRelease', fromId, clientX: e.clientX, clientY: e.clientY, target: e.target })
      return
    }

    if (marqueeStart) {
      finishMarquee(moved, e)
      dragStart = null
      return
    }

    if (nodeId && moved && options.editable?.value && options.dragEnabled?.value) {
      if (!finishGroupDrag(nodeId)) {
        const final = dragOverlay.value.get(nodeId)
        if (final) {
          const { positionX, positionY } = pointerToGrid(final.cx, final.cy)
          emitGesture({ kind: 'nodeDrag', payload: { id: nodeId, positionX, positionY } })
          settleOverlay(nodeId, final, gridToContent(positionX, positionY))
        } else {
          draggingNodeId.value = null
        }
      }
      groupDragStart = null
      suppressClick = true
      dragStart = null
      return
    }

    if (nodeId && !moved) {
      emitGesture({ kind: 'nodeClick', id: nodeId, shiftKey: e.shiftKey })
      suppressClick = true
    } else if (!nodeId && !moved) {
      emitGesture({
        kind: 'backgroundClick',
        content: clientToContent(e.clientX, e.clientY),
        clientX: e.clientX,
        clientY: e.clientY,
      })
    }

    groupDragStart = null
    dragStart = null
  }

  function onPointerLeave() {
    options.onPointerLeaveExtra?.()
  }

  function onClickCapture(e: MouseEvent) {
    if (!suppressClick) return
    e.stopPropagation()
    e.preventDefault()
    suppressClick = false
  }

  function initialPosition() {
    measure()
    fitToContent()
  }

  onMounted(() => {
    const el = stage.value
    if (!el) return
    measure()
    resizeObserver = new ResizeObserver(() => {
      measure()
      clampPan()
    })
    resizeObserver.observe(el)
  })

  onUnmounted(() => {
    resizeObserver?.disconnect()
    resizeObserver = null
  })

  return {
    stageWidth,
    stageHeight,
    scale,
    translateX,
    translateY,
    minScale,
    maxScale,
    fitScale,
    transformStyle,
    marquee,
    dragOverlay,
    draggingNodeId,
    altHeld,
    vertexById,
    applyOverlay,
    measure,
    clampPan,
    fitToContent,
    initialPosition,
    adjustZoom,
    focusNode,
    focusPoint,
    revealPoint,
    clientToContent,
    viewCenterCell,
    nodeIdAtPoint,
    nodeIdFromEvent,
    onWheel,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerLeave,
    onClickCapture,
  }
}
