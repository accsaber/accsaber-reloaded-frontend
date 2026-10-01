<script setup lang="ts">
import { useElementCanvas } from '@/composables/useCanvasScene'
import type { TitleSplatterAuraSpec } from '@/types/api/items'
import { withAlpha } from '@/utils/cosmetics/overlayCanvas'
import { stainPath } from '@/utils/cosmetics/splat'
import { pickVariant, titleAuraRect, type TitleAuraRect } from '@/utils/cosmetics/titleAura'
import { hash01 } from '@/utils/random'
import { computed, useTemplateRef } from 'vue'

const props = defineProps<{
  aura: TitleSplatterAuraSpec
  light: boolean
}>()

type Ctx = CanvasRenderingContext2D

const colors = computed(() => {
  const list = pickVariant(props.light, props.aura.lightColors, props.aura.colors, ['#60a5fa', '#e0f2fe'])
  return list.length > 0 ? list : ['#60a5fa']
})
const intervalS = computed(() => (props.aura.intervalMs ?? 1100) / 1000)
const lifeS = computed(() => (props.aura.lifeMs ?? 4600) / 1000)

const FADE_S = 0.9
const STATIC_T = 7.3

interface Splat {
  x: number
  y: number
  R: number
  age: number
  seed: number
  color: string
  alpha: number
}

let rect: TitleAuraRect | null = null
let start = 0

function easeOut(p: number): number {
  const c = Math.min(1, Math.max(0, p))
  return 1 - Math.pow(1 - c, 3)
}

function splatAt(k: number, t: number, r: TitleAuraRect): Splat {
  const seed = k * 97 + 13
  const age = t - k * intervalS.value
  const life = lifeS.value
  return {
    x: r.x + r.w * (0.02 + hash01(seed) * 0.96),
    y: r.y + r.h * (0.2 + hash01(seed + 1) * 0.6) + (hash01(seed + 2) - 0.5) * r.fs * 0.7,
    R: r.fs * (0.26 + hash01(seed + 3) * 0.3),
    age,
    seed,
    color: colors.value[Math.floor(hash01(seed + 4) * colors.value.length)],
    alpha: age > life - FADE_S ? Math.max(0, (life - age) / FADE_S) : 1,
  }
}

function drawSpikes(g: Ctx, s: Splat, grow: number): void {
  for (let i = 0; i < 3; i++) {
    const h = s.seed + 30 + i * 7
    const a = hash01(h) * Math.PI * 2
    const len = s.R * (0.55 + hash01(h + 1) * 0.6) * grow
    const w = s.R * (0.12 + hash01(h + 2) * 0.08)
    const bx = s.x + Math.cos(a) * s.R * 0.55
    const by = s.y + Math.sin(a) * s.R * 0.55
    const nx = -Math.sin(a) * w
    const ny = Math.cos(a) * w
    g.beginPath()
    g.moveTo(bx + nx, by + ny)
    g.lineTo(bx + Math.cos(a) * len, by + Math.sin(a) * len)
    g.lineTo(bx - nx, by - ny)
    g.closePath()
    g.fill()
  }
}

function drawDroplets(g: Ctx, s: Splat): void {
  const fly = easeOut(s.age / 0.28)
  for (let i = 0; i < 5; i++) {
    const h = s.seed + 60 + i * 11
    const a = hash01(h) * Math.PI * 2
    const d = s.R * (1.15 + hash01(h + 1) * 1.1) * fly
    g.beginPath()
    g.arc(s.x + Math.cos(a) * d, s.y + Math.sin(a) * d, s.R * (0.05 + hash01(h + 2) * 0.09), 0, Math.PI * 2)
    g.fill()
  }
}

function drawDrips(g: Ctx, s: Splat, fs: number): void {
  if (s.age < 0.3) return
  const count = 1 + Math.floor(hash01(s.seed + 90) * 2)
  for (let i = 0; i < count; i++) {
    const h = s.seed + 91 + i * 5
    const x = s.x + (hash01(h) - 0.5) * s.R * 0.9
    const top = s.y + s.R * 0.3
    const maxLen = s.R * (0.7 + hash01(h + 1) * 0.9)
    const len = Math.min(maxLen, (s.age - 0.3) * fs * (0.22 + hash01(h + 2) * 0.14))
    const w = s.R * (0.1 + hash01(h + 3) * 0.06)
    g.beginPath()
    g.moveTo(x - w / 2, top)
    g.lineTo(x - w * 0.22, top + len)
    g.lineTo(x + w * 0.22, top + len)
    g.lineTo(x + w / 2, top)
    g.closePath()
    g.fill()
    g.beginPath()
    g.arc(x, top + len, w * (0.45 + 0.35 * Math.min(1, len / maxLen)), 0, Math.PI * 2)
    g.fill()
  }
}

function drawSplat(g: Ctx, s: Splat, fs: number): void {
  const grow = easeOut(s.age / 0.12)
  g.fillStyle = withAlpha(s.color, (props.light ? 0.3 : 0.42) * s.alpha)
  stainPath(g, s.x, s.y, s.R * grow, s.seed, 7 + Math.floor(hash01(s.seed + 5) * 4))
  g.fill()
  drawSpikes(g, s, grow)
  drawDroplets(g, s)
  drawDrips(g, s, fs)
}

function drawAt(g: Ctx, t: number, r: TitleAuraRect): void {
  const first = Math.max(0, Math.floor((t - lifeS.value) / intervalS.value) + 1)
  const last = Math.floor(t / intervalS.value)
  for (let k = first; k <= last; k++) drawSplat(g, splatAt(k, t, r), r.fs)
}

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')

useElementCanvas(canvasRef, {
  init(_w, _h, now) {
    rect = canvasRef.value ? titleAuraRect(canvasRef.value) : null
    start = now
  },
  draw(ctx, w, h, now, reduced) {
    ctx.clearRect(0, 0, w, h)
    if (!rect) return
    drawAt(ctx, reduced ? STATIC_T : lifeS.value + (now - start) / 1000, rect)
  },
})
</script>

<template>
  <canvas ref="canvas" aria-hidden="true" />
</template>
