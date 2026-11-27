<script setup lang="ts">
import { useElementCanvas } from '@/composables/useCanvasScene'
import type { FrozenLakeScene } from '@/types/cosmetics/background'
import type { Ctx } from '@/utils/cosmetics/canvasShapes'
import { layeredWave, offscreenLayer, paintSky } from '@/utils/cosmetics/sceneLayer'
import { hash01 } from '@/utils/random'
import { useTemplateRef } from 'vue'

const props = defineProps<{ scene: FrozenLakeScene }>()

const STATIC_T = 30
const TRAIL_S = 16
const BUCKETS = 8
const STEPS_PER_BUCKET = 8
const OLD_MARKS_S = 70
const CRACKS = 7
const TAU = Math.PI * 2

let unit = 1
let ice: HTMLCanvasElement | null = null

function skaterAt(t: number, w: number, h: number): [number, number] {
  return [
    w * (0.5 + 0.4 * Math.sin(t * 0.21) + 0.06 * Math.sin(t * 0.83 + 1)),
    h * (0.58 + 0.24 * Math.sin(t * 0.34 + 0.7) + 0.05 * Math.sin(t * 0.97)),
  ]
}

function glide(ctx: Ctx, w: number, h: number, from: number, to: number, steps: number): void {
  ctx.beginPath()
  for (let i = 0; i <= steps; i++) {
    const [x, y] = skaterAt(from + ((to - from) * i) / steps, w, h)
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.stroke()
}

function paintCracks(ctx: Ctx, w: number, h: number): void {
  ctx.strokeStyle = props.scene.crack
  ctx.lineWidth = unit * 0.35
  ctx.globalAlpha = 0.22
  for (let k = 0; k < CRACKS; k++) {
    let x = hash01(k * 13 + 1) * w
    let y = h * (0.3 + hash01(k * 17 + 2) * 0.65)
    let angle = hash01(k * 19 + 3) * TAU
    ctx.beginPath()
    ctx.moveTo(x, y)
    for (let i = 0; i < 4; i++) {
      angle += (hash01(k * 23 + i * 7) - 0.5) * 1.1
      x += Math.cos(angle) * unit * (6 + hash01(k * 29 + i) * 9)
      y += Math.sin(angle) * unit * (3 + hash01(k * 31 + i) * 4)
      ctx.lineTo(x, y)
    }
    ctx.stroke()
  }
  ctx.globalAlpha = 1
}

function paintBank(ctx: Ctx, w: number, h: number, edge: number, reach: number, seed: number): void {
  ctx.beginPath()
  ctx.moveTo(0, edge)
  for (let x = 0; x <= w + unit * 2; x += unit * 2) ctx.lineTo(x, edge + h * reach * (1 + layeredWave((x / w) * 2.4, seed) * 1.5))
  ctx.lineTo(w + unit * 2, edge)
  ctx.fill()
}

function paintIce(ctx: Ctx, w: number, h: number): void {
  const s = props.scene
  paintSky(ctx, w, h, [s.iceTop, s.iceBottom])
  paintCracks(ctx, w, h)
  ctx.strokeStyle = s.trail
  ctx.lineWidth = unit * 0.5
  ctx.globalAlpha = 0.07
  glide(ctx, w, h, -OLD_MARKS_S, 0, OLD_MARKS_S * 4)
  ctx.globalAlpha = 1
  ctx.fillStyle = s.shore
  paintBank(ctx, w, h, 0, 0.1, 0.27)
  paintBank(ctx, w, h, h, -0.06, 0.61)
}

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')

useElementCanvas(canvasRef, {
  init(w, h, _nowMs, scale) {
    unit = Math.min(w, h) / 110
    const [layer, lctx] = offscreenLayer(w, h, scale)
    if (lctx) paintIce(lctx, w, h)
    ice = layer
  },
  draw(ctx, w, h, now, reduced) {
    const t = reduced ? STATIC_T : now / 1000
    const { trail, skater } = props.scene
    ctx.clearRect(0, 0, w, h)
    if (ice) ctx.drawImage(ice, 0, 0, w, h)
    ctx.strokeStyle = trail
    ctx.lineWidth = unit * 0.6
    ctx.lineCap = 'round'
    for (let b = 0; b < BUCKETS; b++) {
      ctx.globalAlpha = 0.5 * ((b + 1) / BUCKETS) ** 1.6
      glide(ctx, w, h, t - TRAIL_S * (1 - b / BUCKETS), t - TRAIL_S * (1 - (b + 1) / BUCKETS), STEPS_PER_BUCKET)
    }
    ctx.globalAlpha = 1
    const [x, y] = skaterAt(t, w, h)
    ctx.fillStyle = skater
    ctx.beginPath()
    ctx.arc(x, y, unit * 1.1, 0, TAU)
    ctx.fill()
  },
})
</script>

<template>
  <canvas ref="canvas" aria-hidden="true" />
</template>
