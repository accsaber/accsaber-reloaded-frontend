<script setup lang="ts">
import { useElementCanvas } from '@/composables/useCanvasScene'
import type { TitleLanternAuraSpec } from '@/types/api/items'
import { lanternLevel } from '@/utils/cosmetics/lanternFlicker'
import { withAlpha } from '@/utils/cosmetics/overlayCanvas'
import { pickVariant, titleAuraRect, type TitleAuraRect } from '@/utils/cosmetics/titleAura'
import { randBetween as rand } from '@/utils/random'
import { useTemplateRef } from 'vue'

const props = defineProps<{
  aura: TitleLanternAuraSpec
  light: boolean
}>()

interface Ember {
  x: number
  y: number
  speed: number
  phase: number
}

const STATIC_T = 2

let rect: TitleAuraRect | null = null
let embers: Ember[] = []

function glow(): string {
  return pickVariant(props.light, props.aura.lightGlow, props.aura.glow, '#e8781e')
}

function core(): string {
  return pickVariant(props.light, props.aura.lightCore, props.aura.core, '#ffe08a')
}

function drawGlow(ctx: CanvasRenderingContext2D, r: TitleAuraRect, level: number): void {
  const cx = r.x + r.w * 0.5
  const cy = r.y + r.h * 0.55
  const rx = r.w * 0.62 + r.fs * 0.6
  const ry = r.fs * 1.1
  ctx.save()
  ctx.translate(cx, cy)
  ctx.scale(rx, ry)
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1)
  g.addColorStop(0, withAlpha(core(), 0.34 * level))
  g.addColorStop(0.35, withAlpha(glow(), 0.22 * level))
  g.addColorStop(1, withAlpha(glow(), 0))
  ctx.fillStyle = g
  ctx.fillRect(-1, -1, 2, 2)
  ctx.restore()
}

function drawEmbers(ctx: CanvasRenderingContext2D, r: TitleAuraRect, t: number, level: number): void {
  for (const e of embers) {
    const u = ((e.y - t * e.speed) % 1.2 + 1.2) % 1.2
    const x = r.x + r.w * (e.x + Math.sin(t * 1.1 + e.phase) * 0.03)
    const y = r.y + r.h + r.fs * 0.3 - u * (r.h + r.fs * 1.6)
    const a = (0.25 + 0.4 * (0.5 + 0.5 * Math.sin(t * 3 + e.phase))) * level * (1 - u / 1.2)
    ctx.fillStyle = withAlpha(core(), a)
    ctx.beginPath()
    ctx.arc(x, y, r.fs * 0.045, 0, Math.PI * 2)
    ctx.fill()
  }
}

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')

useElementCanvas(canvasRef, {
  init() {
    rect = canvasRef.value ? titleAuraRect(canvasRef.value) : null
    embers = Array.from({ length: props.aura.embers ?? 7 }, () => ({ x: rand(0.1, 0.9), y: rand(0, 1.2), speed: rand(0.08, 0.16), phase: rand(0, 6.28) }))
  },
  draw(ctx, w, h, now, reduced) {
    ctx.clearRect(0, 0, w, h)
    if (!rect) return
    const t = reduced ? STATIC_T : now / 1000
    const level = reduced ? 0.85 : lanternLevel(t, 0, props.aura)
    ctx.globalCompositeOperation = props.light ? 'source-over' : 'lighter'
    drawGlow(ctx, rect, level)
    if (!reduced) drawEmbers(ctx, rect, t, level)
    ctx.globalCompositeOperation = 'source-over'
  },
})
</script>

<template>
  <canvas ref="canvas" aria-hidden="true" />
</template>
