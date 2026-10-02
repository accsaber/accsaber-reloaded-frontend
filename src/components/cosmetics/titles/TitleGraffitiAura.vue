<script setup lang="ts">
import { useElementCanvas } from '@/composables/useCanvasScene'
import type { TitleBoilSpec, TitleGraffitiAuraSpec } from '@/types/api/items'
import { dripPath } from '@/utils/cosmetics/splat'
import { boilOffsetEm, boilStep } from '@/utils/cosmetics/titleBoil'
import { pickVariant, titleAuraRect, type TitleAuraRect } from '@/utils/cosmetics/titleAura'
import { hash01 } from '@/utils/random'
import { computed, useTemplateRef } from 'vue'

const props = defineProps<{
  aura: TitleGraffitiAuraSpec
  light: boolean
  boil?: TitleBoilSpec
}>()

type Ctx = CanvasRenderingContext2D
type Pt = [number, number]

const paint = computed(() => pickVariant(props.light, props.aura.lightColor, props.aura.color, '#ffffff'))

const SPRITES = 4
const CAP_HEIGHT = 0.72

let sprites: HTMLCanvasElement[] = []
let rect: TitleAuraRect | null = null
let drawn = -1

function jitter(pts: Pt[], amp: number, seed: number): Pt[] {
  return pts.map(([x, y], i) => [x + (hash01(seed + i * 7) - 0.5) * amp, y + (hash01(seed + i * 7 + 3) - 0.5) * amp])
}

function spray(g: Ctx, cx: number, cy: number, radius: number, count: number, dot: number, seed: number): void {
  for (let i = 0; i < count; i++) {
    const h = seed + i * 19
    const a = hash01(h) * Math.PI * 2
    const d = radius * Math.pow(hash01(h + 1), 0.6)
    g.beginPath()
    g.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, dot * (0.4 + hash01(h + 2) * 0.9), 0, Math.PI * 2)
    g.fill()
  }
}

function sprayAlong(g: Ctx, pts: Pt[], fs: number, seed: number): void {
  g.globalAlpha = 0.4
  pts.forEach(([x, y], i) => spray(g, x, y, fs * 0.16, 6, fs * 0.018, seed + i * 41))
  g.globalAlpha = 1
}

function ear(g: Ctx, base0: Pt, base1: Pt, tip: Pt, fs: number, seed: number): void {
  const pts = jitter([base0, tip, base1], fs * 0.04, seed)
  g.lineCap = 'round'
  g.lineJoin = 'round'
  g.lineWidth = fs * 0.1
  g.beginPath()
  pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)))
  g.stroke()
  sprayAlong(g, pts, fs, seed + 9)
}

function whiskers(g: Ctx, x: number, mid: number, side: number, fs: number, seed: number): void {
  g.lineCap = 'round'
  g.lineWidth = fs * 0.06
  for (const k of [-1, 0, 1]) {
    const pts = jitter([[x, mid + k * fs * 0.1], [x + side * fs * 0.75, mid + k * fs * 0.28]], fs * 0.04, seed + k * 5)
    g.beginPath()
    g.moveTo(pts[0][0], pts[0][1])
    g.lineTo(pts[1][0], pts[1][1])
    g.stroke()
    sprayAlong(g, [pts[1]], fs * 0.5, seed + k * 13)
  }
}

function paintMarks(g: Ctx, r: TitleAuraRect, seed: number): void {
  const fs = r.fs
  const mid = r.y + r.h / 2
  const capTop = mid - (fs * CAP_HEIGHT) / 2
  const base = mid + (fs * CAP_HEIGHT) / 2
  const earW = Math.min(fs * 0.85, r.w * 0.2)
  const L = r.x + fs * 0.02
  const R = r.x + r.w - fs * 0.06
  ear(g, [L, capTop + fs * 0.06], [L + earW, capTop + fs * 0.06], [L + earW * 0.12, capTop - fs * 0.62], fs, seed)
  ear(g, [R - earW, capTop + fs * 0.06], [R, capTop + fs * 0.06], [R - earW * 0.12, capTop - fs * 0.62], fs, seed + 50)
  whiskers(g, r.x - fs * 0.12, mid, -1, fs, seed + 100)
  whiskers(g, r.x + r.w + fs * 0.06, mid, 1, fs, seed + 120)
  g.beginPath()
  for (let i = 0; i < 3; i++) {
    const h = seed + 200 + i * 7
    dripPath(g, r.x + r.w * (0.15 + i * 0.3 + (hash01(h) - 0.5) * 0.12), base - fs * 0.04, fs * (0.18 + hash01(h + 1) * 0.36), fs * 0.07, 0.28, fs * 0.035)
  }
  g.fill()
  g.globalAlpha = 0.35
  spray(g, r.x + fs * 0.1, base + fs * 0.12, fs * 0.5, 14, fs * 0.022, seed + 300)
  spray(g, r.x + r.w - fs * 0.2, capTop - fs * 0.05, fs * 0.4, 10, fs * 0.02, seed + 320)
  g.globalAlpha = 1
}

function buildSprites(w: number, h: number, scale: number): void {
  const r = rect
  if (!r) return
  sprites = Array.from({ length: SPRITES }, (_, i) => {
    const c = document.createElement('canvas')
    c.width = Math.ceil(w * scale)
    c.height = Math.ceil(h * scale)
    const g = c.getContext('2d')
    if (!g) return c
    g.scale(scale, scale)
    g.fillStyle = paint.value
    g.strokeStyle = paint.value
    paintMarks(g, r, 1000 + i * 211)
    return c
  })
}

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')

function setup(w: number, h: number, _now: number, scale: number): void {
  rect = canvasRef.value ? titleAuraRect(canvasRef.value) : null
  buildSprites(w, h, scale)
  drawn = -1
}

useElementCanvas(canvasRef, {
  init: setup,
  resize: setup,
  draw(ctx, w, h, now, reduced) {
    const step = reduced ? 0 : boilStep(now, props.boil)
    if (step === drawn || !rect || sprites.length === 0) return
    drawn = step
    const [dx, dy] = reduced ? [0, 0] : boilOffsetEm(step, props.boil)
    ctx.clearRect(0, 0, w, h)
    ctx.drawImage(sprites[step % SPRITES], dx * rect.fs, dy * rect.fs, w, h)
  },
})
</script>

<template>
  <canvas ref="canvas" aria-hidden="true" />
</template>
