<script setup lang="ts">
import { useReducedMotion } from '@/composables/useReducedMotion'
import {
  bladeTiltDeg,
  createSliceBodies,
  cssVarColor,
  HALVES_LIFE_MS,
  sliceOpacity,
  spawnCutSparks,
  stepAndDrawSparks,
  stepSliceBodies,
  type SliceBodies,
  type Spark,
} from '@/utils/sliceSim'
import { onMounted, onUnmounted, ref, watch, type ComponentPublicInstance } from 'vue'

export interface WikiConcept {
  label: string
  accentToken?: string
}

const props = defineProps<{
  concepts: WikiConcept[]
}>()

const NARROW_WIDTH = 560
const MID_WIDTH = 860
const CHIP_MARGIN_PX = 60
const SLICE_INTERVAL_MS = 2600
const FIRST_SLICE_DELAY_MS = 1600
const POP_MS = 260
const CUT_SHIFT_MAX_PCT = 6
const ORBIT_BASE_RAD_PER_S = (Math.PI * 2) / 130
const SIDES = ['left', 'right'] as const

type Side = (typeof SIDES)[number]

interface OrbitSlot {
  angle: number
  angVel: number
  rxF: number
  ryF: number
}

interface FieldChip {
  id: number
  slotIndex: number
  label: string
  accentToken?: string
  phase: 'in' | 'idle' | 'slicing'
  cutShiftPct: number
  tiltDeg: number
  bodies: SliceBodies | null
  sliceStart: number
  spawnAt: number
  frozenX: number
  frozenY: number
  w: number
  h: number
}

const reducedMotion = useReducedMotion()
const fieldEl = ref<HTMLElement | null>(null)
const sparksEl = ref<HTMLCanvasElement | null>(null)
const chips = ref<FieldChip[]>([])

const chipEls = new Map<number, HTMLElement>()
const halfEls = new Map<string, HTMLElement>()
const slots: OrbitSlot[] = []
const queue: WikiConcept[] = shuffle(props.concepts)

let nextId = 0
let slotCount = 0
let rafId = 0
let lastFrameAt = 0
let nextSliceAt = 0
let fieldW = 0
let fieldH = 0
let sparks: Spark[] = []
let sparkColor = '#ffffff'
let sparkCtx: CanvasRenderingContext2D | null = null
let resizeObserver: ResizeObserver | null = null

function shuffle(source: readonly WikiConcept[]): WikiConcept[] {
  const list = [...source]
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[list[i], list[j]] = [list[j], list[i]]
  }
  return list
}

function slotCountFor(width: number): number {
  const target = width < NARROW_WIDTH ? 5 : width < MID_WIDTH ? 9 : 14
  return Math.min(target, props.concepts.length)
}

function orbitPos(slot: OrbitSlot): { x: number; y: number } {
  const rx = Math.max(60, fieldW / 2 - CHIP_MARGIN_PX) * slot.rxF
  const ry = Math.max(40, fieldH / 2 - 26) * slot.ryF
  return {
    x: fieldW / 2 + Math.cos(slot.angle) * rx,
    y: fieldH / 2 + Math.sin(slot.angle) * ry,
  }
}

function placeChip(chip: FieldChip) {
  const el = chipEls.get(chip.id)
  if (!el) return
  const pos =
    chip.phase === 'slicing'
      ? { x: chip.frozenX, y: chip.frozenY }
      : orbitPos(slots[chip.slotIndex])
  el.style.transform = `translate(${pos.x}px, ${pos.y}px) translate(-50%, -50%)`
}

function setChipRef(chip: FieldChip, el: Element | ComponentPublicInstance | null) {
  if (el instanceof HTMLElement) {
    chipEls.set(chip.id, el)
    placeChip(chip)
  } else {
    chipEls.delete(chip.id)
  }
}

function setHalfRef(chipId: number, side: Side, el: Element | ComponentPublicInstance | null) {
  const key = `${chipId}:${side}`
  if (el instanceof HTMLElement) halfEls.set(key, el)
  else halfEls.delete(key)
}

function halfClipStyle(side: Side, chip: FieldChip) {
  const cut = 50
  const xTop = cut - chip.cutShiftPct
  const xBottom = cut + chip.cutShiftPct
  return {
    clipPath:
      side === 'left'
        ? `polygon(0% 0%, ${xTop}% 0%, ${xBottom}% 100%, 0% 100%)`
        : `polygon(${xTop}% 0%, 100% 0%, 100% 100%, ${xBottom}% 100%)`,
    transformOrigin: `${side === 'left' ? cut / 2 : (100 + cut) / 2}% 50%`,
  }
}

function edgeStyle(chip: FieldChip) {
  return {
    left: 'calc(50% - 1.5px)',
    top: `calc(50% - ${chip.w / 2}px)`,
    height: `${chip.w}px`,
    transform: `rotate(${chip.tiltDeg}deg)`,
  }
}

function makeChip(slotIndex: number, phase: FieldChip['phase'], now: number): FieldChip {
  const concept = queue.shift() ?? { label: '' }
  return {
    id: nextId++,
    slotIndex,
    label: concept.label,
    accentToken: concept.accentToken,
    phase,
    cutShiftPct: 0,
    tiltDeg: 0,
    bodies: null,
    sliceStart: 0,
    spawnAt: now,
    frozenX: 0,
    frozenY: 0,
    w: 0,
    h: 0,
  }
}

function measureField() {
  const field = fieldEl.value
  if (!field) return
  fieldW = field.clientWidth
  fieldH = field.clientHeight
  const canvas = sparksEl.value
  if (!canvas) {
    sparkCtx = null
    return
  }
  const dpr = window.devicePixelRatio || 1
  canvas.width = Math.round(fieldW * dpr)
  canvas.height = Math.round(fieldH * dpr)
  sparkCtx = canvas.getContext('2d')
  sparkCtx?.setTransform(dpr, 0, 0, dpr, 0, 0)
}

function startSlice(chip: FieldChip, now: number) {
  const el = chipEls.get(chip.id)
  if (!el) return
  const pos = orbitPos(slots[chip.slotIndex])
  chip.frozenX = pos.x
  chip.frozenY = pos.y
  chip.w = el.offsetWidth
  chip.h = el.offsetHeight
  chip.cutShiftPct = (Math.random() * 2 - 1) * CUT_SHIFT_MAX_PCT
  chip.tiltDeg = bladeTiltDeg(chip.cutShiftPct, chip.w, chip.h)
  const power = 0.5 + Math.random() * 0.5
  chip.bodies = createSliceBodies(power, 0.5)
  chip.sliceStart = now
  chip.phase = 'slicing'
  sparkColor = cssVarColor(chip.accentToken ?? '--text-secondary')
  spawnCutSparks(sparks, {
    x: pos.x,
    y: pos.y,
    spreadY: chip.h * 0.9,
    shiftPx: (chip.cutShiftPct / 100) * chip.w,
    power,
  })
  placeChip(chip)
}

function updateSlicingChip(chip: FieldChip, dt: number, now: number, index: number) {
  if (!chip.bodies) return
  const life = Math.min(1, (now - chip.sliceStart) / HALVES_LIFE_MS)
  stepSliceBodies(chip.bodies, dt)
  const opacity = sliceOpacity(life)
  for (const side of SIDES) {
    const el = halfEls.get(`${chip.id}:${side}`)
    if (!el) continue
    const body = chip.bodies[side]
    el.style.transform = `translate(${body.x}px, ${body.y}px) rotate(${body.angle}deg)`
    el.style.opacity = String(opacity)
  }
  if (life >= 1) {
    queue.push({ label: chip.label, accentToken: chip.accentToken })
    chips.value.splice(index, 1, makeChip(chip.slotIndex, 'in', now))
  }
}

function frame(now: number) {
  const dt = Math.min(0.05, (now - lastFrameAt) / 1000)
  lastFrameAt = now

  for (const chip of chips.value) {
    if (chip.phase !== 'slicing') slots[chip.slotIndex].angle += slots[chip.slotIndex].angVel * dt
  }

  const slicingActive = chips.value.some((chip) => chip.phase === 'slicing')
  if (!slicingActive && now >= nextSliceAt) {
    const idle = chips.value.filter((chip) => chip.phase === 'idle')
    if (idle.length) {
      startSlice(idle[Math.floor(Math.random() * idle.length)], now)
      nextSliceAt = now + SLICE_INTERVAL_MS
    }
  }

  for (let i = 0; i < chips.value.length; i++) {
    const chip = chips.value[i]
    if (chip.phase === 'slicing') {
      updateSlicingChip(chip, dt, now, i)
    } else {
      if (chip.phase === 'in' && now - chip.spawnAt >= POP_MS) chip.phase = 'idle'
      placeChip(chip)
    }
  }

  if (sparkCtx) {
    sparks = stepAndDrawSparks(sparkCtx, sparks, dt, sparkColor, fieldW, fieldH)
  }

  rafId = requestAnimationFrame(frame)
}

function start() {
  if (rafId || reducedMotion.value) return
  lastFrameAt = performance.now()
  nextSliceAt = Math.max(nextSliceAt, lastFrameAt + FIRST_SLICE_DELAY_MS)
  rafId = requestAnimationFrame(frame)
}

function stop() {
  if (rafId) cancelAnimationFrame(rafId)
  rafId = 0
}

function placeAll() {
  for (const chip of chips.value) placeChip(chip)
}

function buildField(now: number) {
  for (const chip of chips.value) queue.push({ label: chip.label, accentToken: chip.accentToken })
  chips.value = []
  chipEls.clear()
  halfEls.clear()
  slots.length = 0
  slotCount = slotCountFor(fieldW)
  const singleRing = fieldW < NARROW_WIDTH
  for (let i = 0; i < slotCount; i++) {
    const outer = singleRing || i % 2 === 0
    slots.push({
      angle: (i / slotCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.2,
      angVel: ORBIT_BASE_RAD_PER_S,
      rxF: outer ? 0.92 + Math.random() * 0.08 : 0.7 + Math.random() * 0.08,
      ryF: outer ? 0.9 + Math.random() * 0.1 : 0.68 + Math.random() * 0.1,
    })
    chips.value.push(makeChip(i, 'idle', now))
  }
  nextSliceAt = now + FIRST_SLICE_DELAY_MS
}

function onVisibilityChange() {
  if (document.hidden) stop()
  else start()
}

onMounted(() => {
  measureField()
  buildField(performance.now())
  resizeObserver = new ResizeObserver(() => {
    measureField()
    if (slotCountFor(fieldW) !== slotCount) buildField(performance.now())
    if (!rafId) placeAll()
  })
  if (fieldEl.value) resizeObserver.observe(fieldEl.value)
  document.addEventListener('visibilitychange', onVisibilityChange)
  start()
})

watch(reducedMotion, (reduced) => {
  if (reduced) stop()
  else start()
})

onUnmounted(() => {
  stop()
  resizeObserver?.disconnect()
  document.removeEventListener('visibilitychange', onVisibilityChange)
})
</script>

<template>
  <div ref="fieldEl" class="field" aria-hidden="true">
    <span
      v-for="chip in chips"
      :key="chip.id"
      :ref="(el) => setChipRef(chip, el)"
      class="chip"
      :class="`chip--${chip.phase}`"
      :style="{ '--chip-color': `var(${chip.accentToken ?? '--text-secondary'})` }"
    >
      <span class="chip__ghost">{{ chip.label }}</span>
      <span v-if="chip.phase !== 'slicing'" class="chip__face">{{ chip.label }}</span>
      <template v-else>
        <span
          v-for="side in SIDES"
          :key="side"
          :ref="(el) => setHalfRef(chip.id, side, el)"
          class="chip__half"
          :style="halfClipStyle(side, chip)"
        >
          <span class="chip__face">{{ chip.label }}</span>
          <span class="chip__edge" :style="edgeStyle(chip)" />
        </span>
      </template>
    </span>
    <canvas ref="sparksEl" class="field__sparks" />
  </div>
</template>

<style scoped>
.field {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

@media (max-width: 639px) {
  .field {
    position: relative;
    inset: auto;
    height: 150px;
  }
}

.field__sparks {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.chip {
  position: absolute;
  top: 0;
  left: 0;
  white-space: nowrap;
  will-change: transform;
}

.chip__ghost {
  display: block;
  visibility: hidden;
  padding: 4px 12px;
  font-size: var(--text-caption);
  font-weight: 600;
}

.chip__face {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid color-mix(in srgb, var(--chip-color) 35%, var(--bg-overlay));
  border-radius: var(--radius-pill);
  background: var(--bg-surface);
  color: var(--chip-color);
  font-size: var(--text-caption);
  font-weight: 600;
}

.chip--in .chip__face {
  animation: chip-pop 240ms ease-out;
}

.chip__half {
  position: absolute;
  inset: 0;
  will-change: transform, opacity;
}

.chip__half .chip__face {
  inset: 0;
}

.chip__edge {
  position: absolute;
  width: 3px;
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--chip-color) 40%, var(--text-primary)),
    var(--chip-color)
  );
  animation: edge-cool 480ms ease-out forwards;
}

@keyframes edge-cool {
  0% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}

@keyframes chip-pop {
  from {
    transform: scale(0.5);
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .chip--in .chip__face {
    animation: none;
  }
}
</style>
