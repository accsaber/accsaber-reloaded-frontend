<script setup lang="ts">
import { useElementCanvas } from '@/composables/useCanvasScene'
import type { TitleSplatterAuraSpec } from '@/types/api/items'
import { easeOut } from '@/utils/cosmetics/effects'
import { withAlpha } from '@/utils/cosmetics/overlayCanvas'
import { dripPath, stainPath } from '@/utils/cosmetics/splat'
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

function spikes(g: Ctx, s: Splat, grow: number): void {
  for (let i = 0; i < 3; i++) {
    const h = s.seed + 30 + i * 7
    const a = hash01(h) * Math.PI * 2
    const len = s.R * (0.55 + hash01(h + 1) * 0.6) * grow
    const w = s.R * (0.12 + hash01(h + 2) * 0.08)
    const bx = s.x + Math.cos(a) * s.R * 0.55
    const by = s.y + Math.sin(a) * s.R * 0.55
    g.moveTo(bx - Math.sin(a) * w, by + Math.cos(a) * w)
    g.lineTo(bx + Math.cos(a) * len, by + Math.sin(a) * len)
    g.lineTo(bx + Math.sin(a) * w, by - Math.cos(a) * w)
    g.closePath()
  }
}

function droplets(g: Ctx, s: Splat): void {
  const fly = easeOut(s.age / 0.28)
  for (let i = 0; i < 5; i++) {
    const h = s.seed + 60 + i * 11
    const a = hash01(h) * Math.PI * 2
    const d = s.R * (1.15 + hash01(h + 1) * 1.1) * fly
    const x = s.x + Math.cos(a) * d
    const y = s.y + Math.sin(a) * d
    const r = s.R * (0.05 + hash01(h + 2) * 0.09)
    g.moveTo(x + r, y)
    g.arc(x, y, r, 0, Math.PI * 2)
  }
}

function drips(g: Ctx, s: Splat, fs: number): void {
  if (s.age < 0.3) return
  const count = 1 + Math.floor(hash01(s.seed + 90) * 2)
  for (let i = 0; i < count; i++) {
    const h = s.seed + 91 + i * 5
    const maxLen = s.R * (0.7 + hash01(h + 1) * 0.9)
    const len = Math.min(maxLen, (s.age - 0.3) * fs * (0.22 + hash01(h + 2) * 0.14))
    const w = s.R * (0.1 + hash01(h + 3) * 0.06)
    dripPath(g, s.x + (hash01(h) - 0.5) * s.R * 0.9, s.y + s.R * 0.3, len, w, 0.22, w * (0.45 + 0.35 * Math.min(1, len / maxLen)))
  }
}

function drawSplat(g: Ctx, s: Splat, fs: number): void {
  const grow = easeOut(s.age / 0.12)
  g.fillStyle = withAlpha(s.color, (props.light ? 0.3 : 0.42) * s.alpha)
  stainPath(g, s.x, s.y, s.R * grow, s.seed, 7 + Math.floor(hash01(s.seed + 5) * 4))
  g.fill()
  g.beginPath()
  spikes(g, s, grow)
  droplets(g, s)
  drips(g, s, fs)
  g.fill()
}

function drawAt(g: Ctx, t: number, r: TitleAuraRect): void {
  const first = Math.max(0, Math.floor((t - lifeS.value) / intervalS.value) + 1)
  const last = Math.floor(t / intervalS.value)
  for (let k = first; k <= last; k++) drawSplat(g, splatAt(k, t, r), r.fs)
}

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')

function measure(): void {
  rect = canvasRef.value ? titleAuraRect(canvasRef.value) : null
}

useElementCanvas(canvasRef, {
  init(_w, _h, now) {
    measure()
    start = now
  },
  resize: measure,
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
