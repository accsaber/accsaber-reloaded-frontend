<script setup lang="ts">
import { useElementCanvas } from '@/composables/useCanvasScene'
import type { TitleGraffitiAuraSpec } from '@/types/api/items'
import { pickVariant, titleAuraRect, type TitleAuraRect } from '@/utils/cosmetics/titleAura'
import { hash01 } from '@/utils/random'
import { computed, useTemplateRef } from 'vue'

const props = defineProps<{
  aura: TitleGraffitiAuraSpec
  light: boolean
}>()

type Ctx = CanvasRenderingContext2D
type Pt = [number, number]

const paint = computed(() => pickVariant(props.light, props.aura.lightColor, props.aura.color, '#ffffff'))
const stepMs = computed(() => props.aura.stepMs ?? 200)

const CLOCKWISE: Pt[] = [[0, -1], [1, 0], [0, 1], [-1, 0]]
const SPRITES = 4

let sprites: HTMLCanvasElement[] = []
let rect: TitleAuraRect | null = null
let start = 0

function wobble(pts: Pt[], amp: number, seed: number): Pt[] {
  return pts.map(([x, y], i) => [x + (hash01(seed + i * 7) - 0.5) * amp, y + (hash01(seed + i * 7 + 3) - 0.5) * amp])
}

function along(a: Pt, b: Pt, n: number): Pt[] {
  return Array.from({ length: n + 1 }, (_, i) => [a[0] + ((b[0] - a[0]) * i) / n, a[1] + ((b[1] - a[1]) * i) / n])
}

function overspray(g: Ctx, pts: Pt[], width: number, seed: number): void {
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1]
    const [bx, by] = pts[i]
    const n = Math.ceil(Math.hypot(bx - ax, by - ay) / Math.max(0.5, width * 0.35))
    for (let k = 0; k < n; k++) {
      const h = seed + i * 131 + k * 17
      const u = hash01(h)
      const spread = (hash01(h + 1) - 0.5) * (hash01(h + 2) - 0.5) * width * 6
      const ang = hash01(h + 3) * Math.PI * 2
      g.beginPath()
      g.arc(ax + (bx - ax) * u + Math.cos(ang) * spread, ay + (by - ay) * u + Math.sin(ang) * spread, width * (0.08 + hash01(h + 4) * 0.14), 0, Math.PI * 2)
      g.fill()
    }
  }
}

function brush(g: Ctx, pts: Pt[], width: number, seed: number): void {
  g.lineWidth = width
  g.beginPath()
  pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)))
  g.stroke()
  g.globalAlpha = 0.45
  overspray(g, pts, width, seed)
  g.globalAlpha = 1
}

function splatter(g: Ctx, cx: number, cy: number, fs: number, seed: number, count: number): void {
  for (let i = 0; i < count; i++) {
    const h = seed + i * 23
    const a = hash01(h) * Math.PI * 2
    const d = fs * Math.pow(hash01(h + 1), 0.7) * 0.75
    g.beginPath()
    g.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.7, fs * (0.015 + Math.pow(hash01(h + 2), 3) * 0.1), 0, Math.PI * 2)
    g.fill()
  }
}

function drip(g: Ctx, x: number, y: number, len: number, width: number): void {
  g.beginPath()
  g.moveTo(x - width / 2, y)
  g.lineTo(x - width * 0.3, y + len)
  g.lineTo(x + width * 0.3, y + len)
  g.lineTo(x + width / 2, y)
  g.closePath()
  g.fill()
  g.beginPath()
  g.arc(x, y + len, width * 0.55, 0, Math.PI * 2)
  g.fill()
}

function ears(L: number, R: number, T: number, fs: number): Pt[] {
  const earW = Math.min((R - L) * 0.3, fs * 1.7)
  const earH = fs * 1.05
  return [
    [L - fs * 0.08, T], [L + earW * 0.18, T - earH], [L + earW, T],
    [R - earW, T], [R - earW * 0.18, T - earH], [R + fs * 0.08, T],
  ]
}

function paintFrame(g: Ctx, r: TitleAuraRect, seed: number): void {
  const fs = r.fs
  const L = r.x - fs * 0.45
  const R = r.x + r.w + fs * 0.45
  const T = r.y - fs * 0.3
  const B = r.y + r.h + fs * 0.25
  const amp = fs * 0.05
  const thick = fs * 0.16
  const thin = fs * 0.07
  const top = ears(L, R, T, fs)
  const earW = top[2][0] - L
  g.lineCap = 'round'
  g.lineJoin = 'round'
  brush(g, wobble(top, amp, seed), thick, seed + 1)
  brush(g, wobble([[L + earW * 0.25, T - fs * 0.08], [L + earW * 0.24, T - fs * 0.62], [L + earW * 0.62, T - fs * 0.12]], amp, seed + 2), thin, seed + 3)
  brush(g, wobble([[R - earW * 0.62, T - fs * 0.12], [R - earW * 0.24, T - fs * 0.62], [R - earW * 0.25, T - fs * 0.08]], amp, seed + 4), thin, seed + 5)
  brush(g, wobble(along([L, T - fs * 0.1], [L - fs * 0.04, B + fs * 0.12], 4), amp, seed + 6), thick, seed + 7)
  brush(g, wobble(along([R, T - fs * 0.05], [R + fs * 0.03, B + fs * 0.1], 4), amp, seed + 8), thick, seed + 9)
  brush(g, wobble(along([L - fs * 0.22, B], [R + fs * 0.12, B + fs * 0.03], 6), amp, seed + 10), thick, seed + 11)
  brush(g, wobble(along([L + fs * 0.3, B + fs * 0.16], [R - fs * 0.6, B + fs * 0.2], 5), amp * 1.4, seed + 12), thin * 0.7, seed + 13)
  const mid = (T + B) / 2
  for (const side of [-1, 1]) {
    const x0 = side < 0 ? L + fs * 0.28 : R - fs * 0.28
    const x1 = side < 0 ? L - fs * 0.62 : R + fs * 0.62
    for (const k of [-1, 0, 1]) {
      brush(g, wobble([[x0, mid + k * fs * 0.12], [x1, mid + k * fs * 0.34]], amp * 0.6, seed + 20 + k + side * 5), thin, seed + 30 + k + side * 5)
    }
  }
  splatter(g, L + fs * 0.1, B + fs * 0.05, fs, seed + 40, 16)
  splatter(g, R - fs * 0.2, T - fs * 0.1, fs * 0.7, seed + 50, 9)
  for (let i = 0; i < 3; i++) {
    const h = seed + 60 + i * 5
    drip(g, L + (R - L) * (0.18 + hash01(h) * 0.7), B, fs * (0.22 + hash01(h + 1) * 0.42), thick * 0.55)
  }
}

function buildSprites(w: number, h: number, scale: number): void {
  if (!rect) return
  sprites = Array.from({ length: SPRITES }, (_, i) => {
    const c = document.createElement('canvas')
    c.width = Math.ceil(w * scale)
    c.height = Math.ceil(h * scale)
    const g = c.getContext('2d')
    if (!g || !rect) return c
    g.scale(scale, scale)
    g.fillStyle = paint.value
    g.strokeStyle = paint.value
    paintFrame(g, rect, 1000 + i * 211)
    return c
  })
}

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')

function setup(w: number, h: number, scale: number): void {
  rect = canvasRef.value ? titleAuraRect(canvasRef.value) : null
  buildSprites(w, h, scale)
}

useElementCanvas(canvasRef, {
  init(w, h, now, scale) {
    setup(w, h, scale)
    start = now
  },
  resize(w, h, _now, scale) {
    setup(w, h, scale)
  },
  draw(ctx, w, h, now, reduced) {
    ctx.clearRect(0, 0, w, h)
    if (!rect || sprites.length === 0) return
    const step = reduced ? 0 : Math.floor((now - start) / stepMs.value)
    const [dx, dy] = CLOCKWISE[step % CLOCKWISE.length]
    const off = rect.fs * (props.aura.offsetEm ?? 0.07)
    ctx.drawImage(sprites[step % SPRITES], dx * off, dy * off, w, h)
  },
})
</script>

<template>
  <canvas ref="canvas" aria-hidden="true" />
</template>
