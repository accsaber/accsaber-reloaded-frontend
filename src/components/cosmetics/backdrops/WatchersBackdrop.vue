<script setup lang="ts">
import { useBackdropCanvas } from '@/composables/useCanvasScene'
import { sceneUnit } from '@/utils/cosmetics/canvasShapes'
import { createRadialSprite } from '@/utils/cosmetics/sceneLayer'
import { parseHex } from '@/utils/color'
import { randBetween as rand } from '@/utils/random'
import type { WatchersBackdropConfig } from '@/utils/cosmetics/themeBackdrop'
import { useTemplateRef } from 'vue'

const props = defineProps<{
  config: WatchersBackdropConfig
}>()

interface Eye {
  phase: number
  period: number
  hold: number
  cycle: number
  x: number
  y: number
  size: number
  gap: number
  aspect: number
  color: string
  sprite: HTMLCanvasElement
  blinkAt: number
  drawn: [number, number, number, number] | null
}

const STATIC_T = 5
const BLINK_S = 0.09
const GLOW = 2.6
const SPRITE_PX = 64

let eyes: Eye[] = []
let startTime = 0
let unit = 1

function randomHex(): string {
  for (;;) {
    const c = [rand(0, 256), rand(0, 256), rand(0, 256)].map(Math.floor)
    if (Math.max(...c) >= 0x90) return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`
  }
}

function roll(cycle: number): Omit<Eye, 'phase' | 'period' | 'drawn'> {
  const hold = rand(3.5, 7)
  const color = randomHex()
  return {
    cycle,
    hold,
    x: rand(0.02, 0.98),
    y: rand(0.02, 0.98),
    size: 1.6 + Math.pow(Math.random(), 1.6) * 3,
    gap: rand(2.2, 3.2),
    aspect: rand(0.4, 0.6),
    color,
    sprite: createRadialSprite(SPRITE_PX, parseHex(color) ?? [255, 255, 255], [[0, 0.3], [0.4, 0.1], [1, 0]]),
    blinkAt: rand(0.3, 0.75) * hold,
  }
}

function makeEye(): Eye {
  const phase = rand(0, 40)
  const period = rand(14, 30)
  return { phase, period, drawn: null, ...roll(Math.floor(phase / period)) }
}

function eyeAlpha(u: number): number {
  if (u < 0.2) return u / 0.2
  if (u > 0.7) return 1 - (u - 0.7) / 0.3
  return 1
}

function lidScale(e: Eye, s: number): number {
  return Math.abs(s - e.blinkAt) < BLINK_S ? 0.08 : 1
}

function eyeball(ctx: CanvasRenderingContext2D, e: Eye, cx: number, cy: number, r: number, ry: number): void {
  ctx.drawImage(e.sprite, cx - r * GLOW, cy - ry * GLOW, r * GLOW * 2, ry * GLOW * 2)
  ctx.fillStyle = e.color
  ctx.beginPath()
  ctx.moveTo(cx - r, cy)
  ctx.quadraticCurveTo(cx, cy - ry * 2, cx + r, cy)
  ctx.quadraticCurveTo(cx, cy + ry * 2, cx - r, cy)
  ctx.fill()
}

function drawEye(ctx: CanvasRenderingContext2D, e: Eye, w: number, h: number, t: number): void {
  const local = t + e.phase
  const cycle = Math.floor(local / e.period)
  if (cycle !== e.cycle) Object.assign(e, roll(cycle))
  const s = local - cycle * e.period
  if (s >= e.hold) return
  const r = e.size * unit
  const ry = r * e.aspect * lidScale(e, s)
  const x = e.x * w
  const y = e.y * h
  const half = r * e.gap * 0.5
  ctx.globalAlpha = eyeAlpha(s / e.hold) * 0.8
  eyeball(ctx, e, x - half, y, r, ry)
  eyeball(ctx, e, x + half, y, r, ry)
  const pw = half + r * GLOW + 2
  const ph = r * e.aspect * GLOW + 2
  e.drawn = [x - pw, y - ph, pw * 2, ph * 2]
}

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')

useBackdropCanvas(canvasRef, {
  init(w, h, now) {
    startTime = now
    unit = sceneUnit(w, h)
    eyes = Array.from({ length: props.config.count }, makeEye)
  },
  resize(w, h) {
    unit = sceneUnit(w, h)
    for (const e of eyes) e.drawn = null
  },
  draw(ctx, w, h, now, reduced) {
    const t = reduced ? STATIC_T : (now - startTime) / 1000
    for (const e of eyes) {
      if (e.drawn) ctx.clearRect(...e.drawn)
      e.drawn = null
    }
    for (const e of eyes) drawEye(ctx, e, w, h, t)
    ctx.globalAlpha = 1
  },
})
</script>

<template>
  <canvas
    ref="canvas"
    :style="{ opacity: config.opacity }"
    aria-hidden="true"
  />
</template>
