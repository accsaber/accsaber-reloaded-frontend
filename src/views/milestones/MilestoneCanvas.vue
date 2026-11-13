<script setup lang="ts">
import MilestoneNodeView from '@/views/milestones/MilestoneNode.vue'
import MilestoneRegionView from '@/views/milestones/MilestoneRegion.vue'
import MilestoneStencils from '@/views/milestones/MilestoneStencils.vue'
import StageControls from '@/components/domain/StageControls.vue'
import { useStageInteraction, type StageGesture } from '@/composables/useStageInteraction'
import type { MilestoneSetResponse, PrerequisiteLinkResponse } from '@/types/api/milestones'
import type { MilestoneDisplay } from '@/types/display'
import {
  buildMilestoneMap,
  nearestNodeInDirection,
  nodeStateLabel,
  GROUP_LABEL_UNITS,
  MILESTONE_UNIT,
  type MilestoneNode,
  type MilestoneSetGroup,
} from '@/utils/milestoneLayout'
import { squareProjection, type NodeLayout } from '@/utils/stageLayout'
import { resolveFrameTier } from '@/utils/milestoneTiers'
import { useCategoryStore } from '@/stores/categories'
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { clamp } from '@/utils/math'

const props = defineProps<{
  milestones: MilestoneDisplay[]
  sets: MilestoneSetResponse[]
  groups: MilestoneSetGroup[]
  prerequisites: PrerequisiteLinkResponse[]
  loggedIn?: boolean
  selectedId?: string | null
  focusedSetId: string | null
}>()

const emit = defineEmits<{
  select: [id: string | null]
  selectSet: [setId: string]
  focusSet: [setId: string | null]
}>()

const MIN_SCALE = 0.3
const MAX_SCALE = 2.2
const TARGET_SCALE = 0.86
const FOCUS_MIN_SCALE = 0.5
const GRID_PITCH = MILESTONE_UNIT * 21

const categoryStore = useCategoryStore()

const accentByCode = computed(() => {
  const out = new Map<string, string>()
  for (const m of props.milestones) {
    const code = m.categoryCode
    if (!code || out.has(code)) continue
    out.set(code, categoryStore.getAccent(code))
  }
  return out
})

function accentFor(code: string | undefined): string | undefined {
  return code ? accentByCode.value.get(code) : undefined
}

const stencilCombos = computed(() =>
  map.value.nodes.map((n) => ({
    glyph: n.milestone.glyph,
    tier: resolveFrameTier(n.milestone.tier),
  })),
)

const stage = ref<HTMLDivElement | null>(null)

const displayedSetId = ref<string | null>(props.focusedSetId)
const closing = ref(false)

const map = computed(() =>
  buildMilestoneMap({
    milestones: props.milestones,
    sets: props.sets,
    groups: props.groups,
    prerequisites: props.prerequisites,
    loggedIn: !!props.loggedIn,
    focusedSetId: displayedSetId.value,
  }),
)

const vertices = computed<NodeLayout[]>(() =>
  map.value.nodes.map((n) => ({ id: n.id, cx: n.cx, cy: n.cy })),
)

const contentBounds = computed(() => map.value.bounds)

const nodeById = computed(() => {
  const out = new Map<string, MilestoneNode>()
  for (const n of map.value.nodes) out.set(n.id, n)
  return out
})

const {
  stageWidth,
  stageHeight,
  scale,
  minScale,
  transformStyle,
  measure,
  adjustZoom,
  focusPoint,
  revealPoint,
  onWheel,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onClickCapture,
} = useStageInteraction(stage, {
  contentBounds,
  vertices,
  unit: computed(() => MILESTONE_UNIT),
  projection: squareProjection,
  minScale: MIN_SCALE,
  maxScale: MAX_SCALE,
  ignoreSelectors: ['.ms-canvas__zoom'],
  onGesture: handleGesture,
})

let framedOnce = false

function fitBox(readable: boolean) {
  measure()
  const focused = map.value.focusedRect
  const label = GROUP_LABEL_UNITS * MILESTONE_UNIT
  const box = focused
    ? { x: focused.x, y: focused.y - label, width: focused.width, height: focused.height + label }
    : contentBounds.value
  if (box.width <= 0 || box.height <= 0 || stageWidth.value <= 0 || stageHeight.value <= 0) return

  const pad = readable ? 24 : 36
  const fitH = (stageHeight.value - pad * 2) / box.height
  const fitW = (readable ? stageWidth.value * 0.66 : stageWidth.value - pad * 2) / box.width
  const s = readable
    ? clamp(Math.min(fitH, fitW), FOCUS_MIN_SCALE, TARGET_SCALE)
    : clamp(Math.min(fitH, fitW), minScale.value, MAX_SCALE)

  const anchorTop = box.height * s > stageHeight.value - pad * 2
  const cy = anchorTop ? box.y + (stageHeight.value / 2 - pad) / s : box.y + box.height / 2
  focusPoint(box.x + box.width / 2, cy, s, !readable || framedOnce)
  if (readable) framedOnce = true
}

function frameFocused() {
  fitBox(true)
}

const focusedId = ref<string | null>(null)

function regionAt(x: number, y: number) {
  return (
    map.value.regions.find(
      (r) =>
        x >= r.rect.x &&
        x <= r.rect.x + r.rect.width &&
        y >= r.rect.y &&
        y <= r.rect.y + r.rect.height,
    ) ?? null
  )
}

function handleGesture(g: StageGesture) {
  if (g.kind === 'nodeClick') {
    focusedId.value = g.id
    emit('select', g.id)
    return
  }
  if (g.kind !== 'backgroundClick') return

  const region = regionAt(g.content.x, g.content.y)
  if (!region) {
    emit('select', null)
    if (props.focusedSetId) emit('focusSet', null)
    return
  }
  if (region.collapsed) {
    emit('focusSet', region.setId)
    return
  }

  const headerBottom = region.rect.y + region.headerY + MILESTONE_UNIT * 14
  if (g.content.y <= headerBottom) emit('selectSet', region.setId)
  else emit('select', null)
}

const selectedNode = computed(() =>
  props.selectedId ? (nodeById.value.get(props.selectedId) ?? null) : null,
)

const focusedNode = computed(() =>
  focusedId.value ? (nodeById.value.get(focusedId.value) ?? null) : null,
)

const focusedSummary = computed(() => {
  const node = focusedNode.value
  if (!node) return ''
  const m = node.milestone
  return `${m.title}. ${m.tier} tier, ${nodeStateLabel(node)}. ${m.description}`
})

const hoverId = ref<string | null>(null)

const labelNode = computed(
  () =>
    (hoverId.value ? nodeById.value.get(hoverId.value) : null) ??
    selectedNode.value ??
    focusedNode.value ??
    null,
)

function onNodesPointerOver(e: PointerEvent) {
  const el = (e.target as Element | null)?.closest?.('[data-node]') as HTMLElement | null
  hoverId.value = el?.dataset.id ?? null
}

function onNodesPointerLeave() {
  hoverId.value = null
}

const DIRECTIONS: Record<string, [number, number]> = {
  ArrowRight: [1, 0],
  ArrowLeft: [-1, 0],
  ArrowDown: [0, 1],
  ArrowUp: [0, -1],
}

function onKeydown(e: KeyboardEvent) {
  if (map.value.nodes.length === 0) return

  if (e.key === 'Enter' || e.key === ' ') {
    if (!focusedNode.value) return
    e.preventDefault()
    emit('select', focusedNode.value.id)
    return
  }

  if (e.key === 'Escape') {
    emit('select', null)
    if (props.focusedSetId) emit('focusSet', null)
    return
  }

  const dir = DIRECTIONS[e.key]
  if (!dir) return
  e.preventDefault()

  if (!focusedNode.value) {
    focusedId.value = map.value.nodes[0].id
  } else {
    const next = nearestNodeInDirection(map.value.nodes, focusedNode.value, dir[0], dir[1])
    if (next) focusedId.value = next.id
  }

  const node = focusedNode.value
  if (node) revealPoint(node.cx, node.cy, node.radius * 2 + 40)
}

watch(
  () => props.selectedId,
  (id) => {
    if (!id) return
    focusedId.value = id
    const node = nodeById.value.get(id)
    if (node) revealPoint(node.cx, node.cy, node.radius * 2 + 40)
  },
)

let closeTimer = 0

watch(
  () => props.focusedSetId,
  (next) => {
    focusedId.value = null
    window.clearTimeout(closeTimer)

    const skipClose =
      displayedSetId.value === null ||
      map.value.nodes.length === 0 ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (skipClose) {
      displayedSetId.value = next
      void nextTick(frameFocused)
      return
    }

    closing.value = true
    const exitMs = parseFloat(getComputedStyle(stage.value!).getPropertyValue('--dur-exit'))
    closeTimer = window.setTimeout(() => {
      closing.value = false
      displayedSetId.value = next
      void nextTick(frameFocused)
    }, exitMs)
  },
)

watch(
  () => map.value.regions.length,
  () => void nextTick(frameFocused),
)

const controls = [
  { label: 'Zoom in', run: () => adjustZoom(1.25), d: 'M12 5v14M5 12h14' },
  { label: 'Zoom out', run: () => adjustZoom(1 / 1.25), d: 'M5 12h14' },
  { label: 'Fit to view', run: () => fitBox(false), d: 'M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4' },
]

onMounted(() => {
  void nextTick(frameFocused)
})

onUnmounted(() => {
  window.clearTimeout(closeTimer)
})
</script>

<template>
  <div
    ref="stage"
    class="ms-canvas"
    role="application"
    aria-label="Milestone map"
    tabindex="0"
    @wheel="onWheel"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
    @keydown="onKeydown"
    @click.capture="onClickCapture"
  >
    <svg class="ms-canvas__svg" :width="stageWidth" :height="stageHeight">
      <MilestoneStencils :combos="stencilCombos" />
      <defs>
        <pattern
          id="ms-canvas-grid"
          :width="GRID_PITCH"
          :height="GRID_PITCH"
          patternUnits="userSpaceOnUse"
          :patternTransform="transformStyle"
        >
          <path class="ms-canvas__grid-line" :d="`M${GRID_PITCH} 0V${GRID_PITCH}H0`" />
        </pattern>
      </defs>

      <rect class="ms-canvas__grid" width="100%" height="100%" fill="url(#ms-canvas-grid)" />

      <g class="ms-canvas__stage" :transform="transformStyle">
        <text
          v-for="group in map.groups"
          v-show="group.name"
          :key="group.id"
          class="ms-canvas__group"
          :x="group.rect.x"
          :y="group.rect.y + GROUP_LABEL_UNITS * MILESTONE_UNIT * 0.7"
        >
          {{ group.name }}
        </text>

        <MilestoneRegionView
          v-for="region in map.regions"
          :key="region.setId"
          :region="region"
          :logged-in="loggedIn"
        />

        <g class="ms-canvas__edges" :class="{ 'ms-canvas__edges--closing': closing }">
          <path
            v-for="edge in map.edges"
            :key="edge.id"
            class="ms-canvas__edge"
            :class="{
              'ms-canvas__edge--satisfied': edge.satisfied,
              'ms-canvas__edge--blocker': edge.blocker,
            }"
            :d="edge.d"
          />
        </g>

        <circle
          v-if="focusedNode && focusedNode.id !== selectedId"
          class="ms-canvas__focus"
          :cx="focusedNode.cx"
          :cy="focusedNode.cy"
          :r="focusedNode.radius * 1.3"
        />

        <circle
          v-if="selectedNode"
          class="ms-canvas__selection"
          :cx="selectedNode.cx"
          :cy="selectedNode.cy"
          :r="selectedNode.radius * 1.22"
        />

        <g
          class="ms-canvas__nodes"
          :class="{ 'ms-canvas__nodes--closing': closing }"
          @pointerover="onNodesPointerOver"
          @pointerleave="onNodesPointerLeave"
        >
          <MilestoneNodeView
            v-for="(node, index) in map.nodes"
            :key="node.id"
            :node="node"
            :accent="accentFor(node.milestone.categoryCode)"
            :style="{ '--i': Math.min(index, 8) }"
          />
        </g>

        <text
          v-if="labelNode"
          class="ms-canvas__label"
          :style="{ '--inv': 1 / scale }"
          :x="labelNode.cx"
          :y="labelNode.cy + labelNode.radius + 20 / scale"
          text-anchor="middle"
          aria-hidden="true"
        >
          {{ labelNode.milestone.title }}
        </text>
      </g>
    </svg>

    <p class="ms-canvas__status" role="status" aria-live="polite">{{ focusedSummary }}</p>

    <div class="ms-canvas__zoom">
      <StageControls :controls="controls" />
    </div>
  </div>
</template>

<style scoped>
.ms-canvas {
  position: relative;
  width: 100%;
  height: 100%;
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  background: var(--bg-base);
  overflow: hidden;
  touch-action: none;
  cursor: grab;
}

.ms-canvas:active {
  cursor: grabbing;
}

.ms-canvas:focus-visible {
  outline: 2px solid var(--page-accent, var(--accent));
  outline-offset: -2px;
}

.ms-canvas__svg {
  display: block;
}

.ms-canvas__grid-line {
  fill: none;
  stroke: var(--bg-overlay);
  stroke-width: 1;
  opacity: 0.35;
}

.ms-canvas__grid {
  pointer-events: none;
}

.ms-canvas__stage {
  will-change: transform;
}

.ms-canvas__nodes .ms-node {
  animation: ms-canvas-fade-in var(--dur-enter) var(--ease-out) both;
  animation-delay: calc(var(--i) * var(--stagger));
}

.ms-canvas__edge {
  fill: none;
  stroke: var(--bg-overlay);
  stroke-width: 1.5;
  vector-effect: non-scaling-stroke;
  animation: ms-canvas-fade-in var(--dur-enter) var(--ease-out) both;
  animation-delay: var(--dur-fast);
}

@keyframes ms-canvas-fade-in {
  from {
    opacity: 0;
  }
}

.ms-canvas__nodes--closing .ms-node,
.ms-canvas__edges--closing .ms-canvas__edge {
  animation: ms-canvas-fade-out var(--dur-exit) var(--ease-in) both;
  animation-delay: 0ms;
  pointer-events: none;
}

@keyframes ms-canvas-fade-out {
  to {
    opacity: 0;
  }
}

.ms-canvas__edge--satisfied {
  stroke: var(--text-tertiary);
}

.ms-canvas__edge--blocker {
  stroke-dasharray: 4 4;
}

.ms-canvas__selection {
  fill: none;
  stroke: var(--page-accent, var(--accent));
  stroke-width: 2;
  vector-effect: non-scaling-stroke;
  pointer-events: none;
}

.ms-canvas__focus {
  fill: none;
  stroke: var(--text-primary);
  stroke-width: 1.5;
  stroke-dasharray: 3 4;
  vector-effect: non-scaling-stroke;
  pointer-events: none;
}

.ms-canvas__group {
  fill: var(--text-tertiary);
  font-family: var(--font-sans);
  font-size: 34px;
  font-weight: 700;
  pointer-events: none;
}

.ms-canvas__label {
  fill: var(--text-primary);
  font-family: var(--font-sans);
  font-size: calc(var(--text-body) * var(--inv));
  font-weight: 600;
  paint-order: stroke;
  stroke: var(--bg-base);
  stroke-width: calc(4px * var(--inv));
  stroke-linejoin: round;
  pointer-events: none;
}

.ms-canvas__status {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

.ms-canvas__zoom {
  position: absolute;
  right: var(--space-md);
  bottom: var(--space-md);
}

@media (prefers-reduced-motion: reduce) {
  .ms-canvas__stage {
    will-change: auto;
  }

  .ms-canvas__nodes .ms-node,
  .ms-canvas__edge,
  .ms-canvas__nodes--closing .ms-node,
  .ms-canvas__edges--closing .ms-canvas__edge {
    animation: none;
  }
}
</style>
