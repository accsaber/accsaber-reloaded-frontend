<script setup lang="ts">
import { useElementCanvas } from '@/composables/useCanvasScene'
import { useStackPointer } from '@/composables/useStackPointer'
import type { BorderFrostOverlaySpec, BorderOverlayHost } from '@/types/cosmetics/border'
import type { Ctx } from '@/utils/cosmetics/canvasShapes'
import { frostFern } from '@/utils/cosmetics/frost'
import { enterUnitSpace, frameDelta, primaryFillHex, withAlpha } from '@/utils/cosmetics/overlayCanvas'
import { blitSceneLayer, clearSceneLayer, createSceneLayer, paintSceneLayer } from '@/utils/cosmetics/sceneLayer'
import { clamp01, smoothstep01 } from '@/utils/math'
import { computed, useTemplateRef, watch } from 'vue'

const props = defineProps<BorderOverlayHost & { overlay: BorderFrostOverlaySpec }>()

interface Wipe {
  x: number
  y: number
  at: number
}

const MARGIN = 20
const PANE = { x: 7, y: 7, size: 86, r: 3 }
const CREEP_S = 46
const WIPE_R = 11
const WIPE_STEP = 3.5
const WIPE_MAX = 400
const FOG_S = 5
const CORNERS: [number, number, number][] = [[7, 7, 0.78], [93, 7, 2.36], [93, 93, 3.93], [7, 93, 5.5]]
const SILL = [7, 93, 14, 87.5, 24, 89.5, 36, 86.5, 50, 89, 63, 86.5, 76, 89.5, 86, 87.5, 93, 93]

let rim: HTMLCanvasElement | null = null
let deep: HTMLCanvasElement | null = null
let work: HTMLCanvasElement | null = null
let wipes: Wipe[] = []
let fogAt = -100
let clock = 0
let last = 0

let inherited = ''
const frame = computed(() => primaryFillHex(props.color?.states?.[0]?.fill))

function panePath(ctx: Ctx): void {
  ctx.beginPath()
  ctx.roundRect(PANE.x, PANE.y, PANE.size, PANE.size, PANE.r)
}

function paintFrost(ctx: Ctx, w: number, h: number, inner: number, outer: number, ferns: number): void {
  enterUnitSpace(ctx, w, h, MARGIN)
  panePath(ctx)
  ctx.clip()
  const g = ctx.createRadialGradient(50, 50, inner, 50, 50, outer)
  g.addColorStop(0, withAlpha(props.overlay.frost, 0))
  g.addColorStop(0.55, withAlpha(props.overlay.frost, 0.5))
  g.addColorStop(1, withAlpha(props.overlay.frost, 0.92))
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 100, 100)
  const path = new Path2D()
  CORNERS.forEach(([x, y, a], i) => {
    frostFern(path, x, y, a, ferns, 3, 1, i + 1)
    frostFern(path, x, y, a - 0.5, ferns * 0.7, 2, 1, i + 7)
    frostFern(path, x, y, a + 0.5, ferns * 0.7, 2, 1, i + 13)
  })
  ctx.strokeStyle = withAlpha(props.overlay.frost, 0.85)
  ctx.lineWidth = 0.55
  ctx.lineCap = 'round'
  ctx.stroke(path)
}

function build(ctx: Ctx, w: number, h: number): void {
  rim = paintSceneLayer(ctx, (lctx) => paintFrost(lctx, w, h, 34, 62, 22))
  deep = paintSceneLayer(ctx, (lctx) => paintFrost(lctx, w, h, 10, 52, 38))
}

function creep(): number {
  const u = (clock % CREEP_S) / CREEP_S
  const cycle = smoothstep01(clamp01(u / 0.45)) * (1 - smoothstep01(clamp01((u - 0.7) / 0.3)))
  const fog = 1 - smoothstep01(clamp01((clock - fogAt) / FOG_S))
  return Math.max(cycle, fog)
}

function readPointer(): void {
  const at = pointer.read()
  if (at && at.nx < 0.43 && at.ny < 0.43) {
    const x = 50 + at.x * 100
    const y = 50 + at.y * 100
    const prev = wipes[wipes.length - 1]
    if (!prev || Math.hypot(prev.x - x, prev.y - y) > WIPE_STEP) wipes.push({ x, y, at: clock })
    if (wipes.length > WIPE_MAX) wipes.shift()
  }
  if (pointer.takePress()) fogAt = clock
}

function dropOldWipes(): void {
  const keep = (props.overlay.refrostMs ?? 6000) / 1000
  while (wipes.length && clock - wipes[0].at > keep) wipes.shift()
}

function compose(ctx: Ctx, w: number, h: number, level: number): HTMLCanvasElement | null {
  if (!rim || !deep) return null
  work ??= createSceneLayer(ctx)
  clearSceneLayer(work)
  const wctx = work.getContext('2d')
  if (!wctx) return null
  blitSceneLayer(wctx, rim, 'source-over')
  wctx.globalAlpha = level
  blitSceneLayer(wctx, deep, 'source-over')
  wctx.globalAlpha = 1
  if (!wipes.length) return work
  const keep = (props.overlay.refrostMs ?? 6000) / 1000
  wctx.save()
  enterUnitSpace(wctx, w, h, MARGIN)
  wctx.globalCompositeOperation = 'destination-out'
  const g = wctx.createRadialGradient(0, 0, WIPE_R * 0.35, 0, 0, WIPE_R)
  g.addColorStop(0, 'rgba(0, 0, 0, 1)')
  g.addColorStop(1, 'rgba(0, 0, 0, 0)')
  wctx.fillStyle = g
  for (const wipe of wipes) {
    wctx.globalAlpha = 1 - smoothstep01((clock - wipe.at) / keep)
    wctx.translate(wipe.x, wipe.y)
    wctx.fillRect(-WIPE_R, -WIPE_R, WIPE_R * 2, WIPE_R * 2)
    wctx.translate(-wipe.x, -wipe.y)
  }
  wctx.restore()
  return work
}

function drawFittings(ctx: Ctx, w: number, h: number): void {
  const o = props.overlay
  ctx.save()
  enterUnitSpace(ctx, w, h, MARGIN)
  if (o.muntins !== false) {
    ctx.fillStyle = frame.value ?? inherited
    ctx.fillRect(48.9, PANE.y, 2.2, PANE.size)
    ctx.fillRect(PANE.x, 48.9, PANE.size, 2.2)
  }
  ctx.fillStyle = o.snow
  ctx.beginPath()
  ctx.moveTo(SILL[0], SILL[1])
  for (let i = 2; i < SILL.length - 2; i += 2) ctx.quadraticCurveTo(SILL[i], SILL[i + 1], (SILL[i] + SILL[i + 2]) / 2, (SILL[i + 1] + SILL[i + 3]) / 2)
  ctx.lineTo(93, 93)
  ctx.fill()
  ctx.fillStyle = o.shade
  ctx.fillRect(PANE.x, 92.2, PANE.size, 0.8)
  ctx.restore()
}

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')
const pointer = useStackPointer(canvasRef, MARGIN, () => props.overlay.hover !== false)

watch(() => props.overlay, () => {
  rim = null
})

useElementCanvas(canvasRef, {
  init(_w, _h, nowMs) {
    inherited = canvasRef.value ? getComputedStyle(canvasRef.value).color : props.overlay.snow
    rim = null
    work = null
    wipes = []
    last = nowMs
  },
  draw(ctx, w, h, now, reduced) {
    ctx.clearRect(0, 0, w, h)
    if (!rim) build(ctx, w, h)
    clock += frameDelta(now, last, reduced)
    last = now
    if (!reduced) {
      readPointer()
      dropOldWipes()
    }
    const layer = compose(ctx, w, h, reduced ? 0.35 : creep())
    if (layer) blitSceneLayer(ctx, layer, 'source-over')
    drawFittings(ctx, w, h)
  },
})
</script>

<template>
  <canvas ref="canvas" aria-hidden="true" />
</template>
