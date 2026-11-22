<script setup lang="ts">
import { useElementCanvas } from '@/composables/useCanvasScene'
import { useStackPointer } from '@/composables/useStackPointer'
import type { BorderGingerbreadOverlaySpec, BorderOverlayHost } from '@/types/cosmetics/border'
import { biteMark, GINGERBREAD_BITES, paintGingerbread } from '@/utils/cosmetics/gingerbread'
import { frameDelta, overlaySpace, primaryFillHex } from '@/utils/cosmetics/overlayCanvas'
import { blitSceneLayer, clearSceneLayer, createSceneLayer, paintSceneLayer } from '@/utils/cosmetics/sceneLayer'
import { clamp01 } from '@/utils/math'
import { hash01, randBetween as rand } from '@/utils/random'
import { computed, useTemplateRef, watch } from 'vue'

const props = defineProps<BorderOverlayHost & { overlay: BorderGingerbreadOverlaySpec }>()

type Ctx = CanvasRenderingContext2D
type Phase = 'whole' | 'eating' | 'gone' | 'rebuild'

const MARGIN = 20
const FLOOR = 117
const BITE_S = 0.18
const TICK_S = 0.13
const GONE_S = 1.2
const CRUMBS_PER_BITE = 6
const CRUMB_MAX = 110
const CRUMB_RETURN_S = 0.16
const CLICK_REACH = 24

interface Crumb {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  seed: number
  rest: boolean
  dark: boolean
  leaving: number
  tx: number
  ty: number
}

let phase: Phase = 'whole'
let order: number[] = []
let eaten: number[] = []
let amount: number[] = GINGERBREAD_BITES.map(() => 0)
let target: number[] = GINGERBREAD_BITES.map(() => 0)
let crumbs: Crumb[] = []
let clock = 0
let last = 0
let nextAt = 0
let art: HTMLCanvasElement | null = null
let work: HTMLCanvasElement | null = null

const icing = computed(() => primaryFillHex(props.color?.states?.[0]?.fill) ?? props.overlay.icing)

watch([icing, () => props.overlay], () => {
  art = null
})

function idle(): number {
  return rand(props.overlay.minIntervalMs ?? 7000, props.overlay.maxIntervalMs ?? 12000) / 1000
}

function shuffled(): number[] {
  const out = GINGERBREAD_BITES.map((_, i) => i)
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand(0, i + 1))
    const swap = out[i]
    out[i] = out[j]
    out[j] = swap
  }
  return out
}

function spawnCrumbs(i: number): void {
  const [x, y, r] = GINGERBREAD_BITES[i]
  for (let k = 0; k < CRUMBS_PER_BITE && crumbs.length < CRUMB_MAX; k++) {
    crumbs.push({
      x: x + rand(-r, r) * 0.6,
      y: y + rand(-r, r) * 0.6,
      vx: rand(-16, 16),
      vy: rand(-24, -4),
      r: rand(0.6, 1.4),
      seed: rand(0, 100),
      rest: false,
      dark: k % 3 === 0,
      leaving: -1,
      tx: 0,
      ty: 0,
    })
  }
}

function bite(i: number): void {
  order = order.filter((b) => b !== i)
  eaten.push(i)
  target[i] = 1
  spawnCrumbs(i)
  nextAt = clock + rand(0.7, 1.3)
}

function restoreOne(): void {
  const i = eaten.pop()
  if (i === undefined) return
  target[i] = 0
  const [tx, ty] = GINGERBREAD_BITES[i]
  const share = Math.ceil(crumbs.filter((c) => c.leaving < 0).length / (eaten.length + 1))
  let sent = 0
  for (const c of crumbs) {
    if (c.leaving >= 0 || sent >= share) continue
    c.leaving = clock
    c.tx = tx
    c.ty = ty
    sent++
  }
  nextAt = clock + TICK_S
}

function settled(): boolean {
  return amount.every((a, i) => a === target[i])
}

function stepPhase(): void {
  if (clock < nextAt) return
  if (phase === 'whole') {
    phase = 'eating'
    order = shuffled()
  }
  if (phase === 'eating') {
    if (order.length) bite(order[0])
    else if (settled()) {
      phase = 'gone'
      nextAt = clock + GONE_S
    }
  } else if (phase === 'gone') {
    phase = 'rebuild'
  } else if (eaten.length) {
    restoreOne()
  } else if (settled()) {
    phase = 'whole'
    crumbs = []
    nextAt = clock + idle()
  }
}

function stepBites(dt: number): void {
  amount = amount.map((a, i) => {
    const rate = target[i] > a ? dt / BITE_S : -dt / TICK_S
    return target[i] > a ? Math.min(target[i], a + rate) : Math.max(target[i], a + rate)
  })
}

function stepCrumbs(dt: number): void {
  crumbs = crumbs.filter((c) => c.leaving < 0 || clock - c.leaving < CRUMB_RETURN_S)
  for (const c of crumbs) {
    if (c.rest || c.leaving >= 0) continue
    c.vy += 90 * dt
    c.x += c.vx * dt
    c.y += c.vy * dt
    if (c.y < FLOOR - hash01(c.seed) * 1.6) continue
    c.rest = true
  }
}

function pressed(): void {
  const at = pointer.takePress()
  if (!at || phase === 'gone' || phase === 'rebuild') return
  const x = 50 + at.x * 100
  const y = 50 + at.y * 100
  const open = phase === 'whole' ? GINGERBREAD_BITES.map((_, i) => i) : order
  let best = -1
  let bestGap = CLICK_REACH
  for (const i of open) {
    const gap = Math.hypot(GINGERBREAD_BITES[i][0] - x, GINGERBREAD_BITES[i][1] - y)
    if (gap < bestGap) {
      best = i
      bestGap = gap
    }
  }
  if (best < 0) return
  if (phase === 'whole') {
    phase = 'eating'
    order = shuffled()
  }
  bite(best)
}

function toUnits(ctx: Ctx, w: number, h: number): void {
  const { sx, sy, toX, toY } = overlaySpace(w, h, MARGIN)
  ctx.translate(toX(0), toY(0))
  ctx.scale(sx, sy)
}

function cookieArt(ctx: Ctx, w: number, h: number): HTMLCanvasElement {
  art ??= paintSceneLayer(ctx, (lctx) => {
    toUnits(lctx, w, h)
    paintGingerbread(lctx, props.overlay, icing.value)
  })
  return art
}

function bitten(ctx: Ctx, w: number, h: number): HTMLCanvasElement {
  work ??= createSceneLayer(ctx)
  clearSceneLayer(work)
  const wctx = work.getContext('2d')
  if (!wctx) return work
  blitSceneLayer(wctx, cookieArt(ctx, w, h), 'source-over')
  wctx.save()
  toUnits(wctx, w, h)
  GINGERBREAD_BITES.forEach(([x, y, r], i) => {
    if (amount[i] <= 0) return
    const size = r * (1 - (1 - amount[i]) ** 3)
    wctx.globalCompositeOperation = 'source-atop'
    wctx.fillStyle = props.overlay.edge
    biteMark(wctx, x, y, size + 0.9)
    wctx.fill()
    wctx.globalCompositeOperation = 'destination-out'
    biteMark(wctx, x, y, size)
    wctx.fill()
  })
  wctx.restore()
  return work
}

function drawCrumb(ctx: Ctx, c: Crumb): void {
  const back = c.leaving >= 0 ? clamp01((clock - c.leaving) / CRUMB_RETURN_S) : 0
  const x = c.x + (c.tx - c.x) * back
  const y = c.y + (c.ty - c.y) * back
  const r = c.r * (1 - back * 0.7)
  ctx.fillStyle = c.dark ? props.overlay.edge : props.overlay.cookie
  ctx.beginPath()
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2 + c.seed
    const reach = r * (0.6 + 0.6 * hash01(c.seed + k))
    ctx.lineTo(x + Math.cos(a) * reach, y + Math.sin(a) * reach)
  }
  ctx.closePath()
  ctx.fill()
}

function drawScene(ctx: Ctx, w: number, h: number): void {
  const whole = amount.every((a) => a <= 0)
  const none = amount.every((a) => a >= 1)
  if (!none) blitSceneLayer(ctx, whole ? cookieArt(ctx, w, h) : bitten(ctx, w, h), 'source-over')
  ctx.save()
  toUnits(ctx, w, h)
  for (const c of crumbs) drawCrumb(ctx, c)
  ctx.restore()
}

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')
const pointer = useStackPointer(canvasRef, MARGIN, () => props.overlay.hover !== false)

function reset(nowMs: number): void {
  art = null
  work = null
  last = nowMs
}

useElementCanvas(canvasRef, {
  init(_w, _h, nowMs) {
    phase = 'whole'
    order = []
    eaten = []
    amount = GINGERBREAD_BITES.map(() => 0)
    target = GINGERBREAD_BITES.map(() => 0)
    crumbs = []
    clock = 0
    nextAt = idle() * rand(0.3, 0.6)
    reset(nowMs)
  },
  resize(_w, _h, nowMs) {
    reset(nowMs)
  },
  draw(ctx, w, h, now, reduced) {
    ctx.clearRect(0, 0, w, h)
    const dt = frameDelta(now, last, reduced)
    last = now
    clock += dt
    if (!reduced) {
      pressed()
      stepPhase()
      stepBites(dt)
      stepCrumbs(dt)
    }
    drawScene(ctx, w, h)
  },
})
</script>

<template>
  <canvas ref="canvas" aria-hidden="true" />
</template>
