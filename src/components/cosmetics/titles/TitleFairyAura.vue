<script setup lang="ts">
import { useElementCanvas } from '@/composables/useCanvasScene'
import type { TitleFairyAuraSpec } from '@/types/api/items'
import { lerpHex } from '@/utils/color'
import { withAlpha } from '@/utils/cosmetics/overlayCanvas'
import { pickVariant, titleAuraRect, type TitleAuraRect } from '@/utils/cosmetics/titleAura'
import { randBetween as rand } from '@/utils/random'
import { computed, useTemplateRef } from 'vue'

const props = defineProps<{
  aura: TitleFairyAuraSpec
  light: boolean
}>()

const colors = computed(() => {
  const list = pickVariant(props.light, props.aura.lightColors, props.aura.colors)
  return list && list.length ? list : ['#f9a8d4', '#a7f3d0', '#fde68a', '#c4b5fd']
})

const TRAIL = 22

interface Pixie {
  a: number
  b: number
  phase: number
  speed: number
  hue: number
  trail: [number, number][]
}

let rect: TitleAuraRect | null = null
let pixies: Pixie[] = []

function tint(p: Pixie, t: number): string {
  const cs = colors.value
  const pos = t * 0.35 + p.hue
  const i = Math.floor(pos) % cs.length
  return lerpHex(cs[i] ?? '#f9a8d4', cs[(i + 1) % cs.length] ?? '#a7f3d0', pos % 1)
}

function pixiePos(p: Pixie, t: number, r: TitleAuraRect): [number, number] {
  const u = t * p.speed + p.phase
  const x = r.x + r.w / 2 + Math.sin(u * p.a) * (r.w / 2 + r.fs * 0.45)
  const y = r.y + r.h / 2 + Math.sin(u * p.b + 1.2) * (r.h / 2 + r.fs * 0.35)
  return [x, y]
}

function drawSpark(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string, a: number): void {
  ctx.strokeStyle = withAlpha(color, a)
  ctx.lineWidth = Math.max(0.5, s * 0.25)
  ctx.beginPath()
  ctx.moveTo(x - s, y)
  ctx.lineTo(x + s, y)
  ctx.moveTo(x, y - s)
  ctx.lineTo(x, y + s)
  ctx.stroke()
}

function drawPixie(ctx: CanvasRenderingContext2D, p: Pixie, t: number, r: TitleAuraRect): void {
  const color = tint(p, t)
  p.trail.forEach(([x, y], k) => {
    const a = (k / TRAIL) * 0.5
    ctx.fillStyle = withAlpha(color, a)
    ctx.beginPath()
    ctx.arc(x, y, r.fs * 0.03 * (0.4 + k / TRAIL), 0, Math.PI * 2)
    ctx.fill()
    if (k % 5 === 0) drawSpark(ctx, x + Math.sin(k * 7) * r.fs * 0.1, y + Math.cos(k * 5) * r.fs * 0.1, r.fs * 0.06 * (k / TRAIL), color, a * 0.9)
  })
  const [x, y] = p.trail[p.trail.length - 1] ?? [0, 0]
  const glow = ctx.createRadialGradient(x, y, 0, x, y, r.fs * 0.28)
  glow.addColorStop(0, withAlpha('#ffffff', 0.95))
  glow.addColorStop(0.35, withAlpha(color, 0.7))
  glow.addColorStop(1, withAlpha(color, 0))
  ctx.fillStyle = glow
  ctx.fillRect(x - r.fs * 0.3, y - r.fs * 0.3, r.fs * 0.6, r.fs * 0.6)
  drawSpark(ctx, x, y, r.fs * 0.14 * (0.7 + 0.3 * Math.sin(t * 9 + p.phase)), '#ffffff', 0.9)
}

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')

useElementCanvas(canvasRef, {
  init() {
    rect = canvasRef.value ? titleAuraRect(canvasRef.value) : null
    pixies = Array.from({ length: props.aura.count ?? 3 }, (_, i) => ({ a: rand(0.8, 1.3), b: rand(1.4, 2.2), phase: i * 2.1, speed: rand(0.5, 0.8), hue: i * 1.3, trail: [] }))
  },
  draw(ctx, w, h, now, reduced) {
    ctx.clearRect(0, 0, w, h)
    if (!rect) return
    const t = reduced ? 3 : now / 1000
    ctx.globalCompositeOperation = props.light ? 'source-over' : 'lighter'
    for (const p of pixies) {
      if (reduced && p.trail.length === 0) {
        for (let k = TRAIL; k >= 0; k--) p.trail.push(pixiePos(p, t - k * 0.04, rect))
      } else if (!reduced) {
        p.trail.push(pixiePos(p, t, rect))
        if (p.trail.length > TRAIL) p.trail.shift()
      }
      drawPixie(ctx, p, t, rect)
    }
    ctx.globalCompositeOperation = 'source-over'
  },
})
</script>

<template>
  <canvas ref="canvas" aria-hidden="true" />
</template>
