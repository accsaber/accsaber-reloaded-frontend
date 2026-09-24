<script setup lang="ts">
import { useElementCanvas } from '@/composables/useCanvasScene'
import type { TitleLightAuraSpec } from '@/types/api/items'
import { withAlpha } from '@/utils/cosmetics/overlayCanvas'
import { offscreenLayer } from '@/utils/cosmetics/sceneLayer'
import { pickVariant, titleAuraRect, type TitleAuraRect } from '@/utils/cosmetics/titleAura'
import { hash01 } from '@/utils/random'
import { computed, useTemplateRef } from 'vue'

const props = defineProps<{
  aura: TitleLightAuraSpec
  light: boolean
}>()

const color = computed(() => pickVariant(props.light, props.aura.lightColor, props.aura.color, '#fff3c4'))
const flare = computed(() => pickVariant(props.light, props.aura.lightFlare, props.aura.flare, color.value))

const RAYS = 14
const RAY_HALF = Math.tan(0.05)

let rect: TitleAuraRect | null = null
let ray: HTMLCanvasElement | null = null

function buildRay(len: number, scale: number): HTMLCanvasElement {
  const [c, g] = offscreenLayer(len, len * RAY_HALF * 2, scale)
  if (!g) return c
  const grad = g.createLinearGradient(0, 0, len, 0)
  grad.addColorStop(0, withAlpha(color.value, 0.22))
  grad.addColorStop(1, withAlpha(color.value, 0))
  g.fillStyle = grad
  g.beginPath()
  g.moveTo(0, len * RAY_HALF)
  g.lineTo(len, 0)
  g.lineTo(len, len * RAY_HALF * 2)
  g.closePath()
  g.fill()
  return c
}

function reach(r: TitleAuraRect): number {
  return r.w * 0.6 + r.fs * 1.2
}

function drawRays(ctx: CanvasRenderingContext2D, r: TitleAuraRect, t: number): void {
  if (!ray) return
  const full = reach(r)
  ctx.save()
  ctx.translate(r.x + r.w / 2, r.y + r.h / 2)
  ctx.scale(1, 0.55)
  ctx.rotate(t * 0.12)
  for (let i = 0; i < RAYS; i++) {
    const len = full * (0.7 + 0.3 * hash01(i * 5)) * (0.6 + 0.4 * Math.sin(t * 0.9 + i * 1.7))
    ctx.drawImage(ray, 0, -len * RAY_HALF, len, len * RAY_HALF * 2)
    ctx.rotate((Math.PI * 2) / RAYS)
  }
  ctx.restore()
}

function drawHalo(ctx: CanvasRenderingContext2D, r: TitleAuraRect, t: number): void {
  const cx = r.x + r.w / 2
  const cy = r.y + r.h / 2
  const pulse = 0.85 + 0.15 * Math.sin(t * 1.3)
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, (r.w / 2 + r.fs * 0.6) * pulse)
  g.addColorStop(0, withAlpha(color.value, 0.28))
  g.addColorStop(0.6, withAlpha(color.value, 0.08))
  g.addColorStop(1, withAlpha(color.value, 0))
  ctx.fillStyle = g
  ctx.fillRect(0, 0, r.x * 2 + r.w, r.y * 2 + r.h)
  ctx.strokeStyle = withAlpha(color.value, 0.35 * pulse)
  ctx.lineWidth = Math.max(0.6, r.fs * 0.03)
  ctx.beginPath()
  ctx.ellipse(cx, cy, r.w / 2 + r.fs * 0.35, r.h / 2 + r.fs * 0.3, 0, 0, Math.PI * 2)
  ctx.stroke()
}

function drawFlares(ctx: CanvasRenderingContext2D, r: TitleAuraRect, t: number): void {
  for (let i = 0; i < 4; i++) {
    const u = (t * 0.08 + i * 0.25) % 1
    const x = r.x - r.fs * 0.5 + (r.w + r.fs) * u
    const y = r.y + r.h * (0.15 + 0.7 * hash01(i * 9))
    const a = Math.sin(u * Math.PI) * 0.55
    ctx.fillStyle = withAlpha(flare.value, a)
    ctx.beginPath()
    ctx.arc(x, y, r.fs * 0.05, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = withAlpha(color.value, a)
    ctx.lineWidth = Math.max(0.5, r.fs * 0.02)
    ctx.beginPath()
    ctx.moveTo(x - r.fs * 0.22, y)
    ctx.lineTo(x + r.fs * 0.22, y)
    ctx.moveTo(x, y - r.fs * 0.22)
    ctx.lineTo(x, y + r.fs * 0.22)
    ctx.stroke()
  }
}

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')

useElementCanvas(canvasRef, {
  init(_w, _h, _now, scale) {
    rect = canvasRef.value ? titleAuraRect(canvasRef.value) : null
    ray = rect ? buildRay(reach(rect), scale) : null
  },
  draw(ctx, w, h, now, reduced) {
    ctx.clearRect(0, 0, w, h)
    if (!rect) return
    const t = reduced ? 3 : now / 1000
    ctx.globalCompositeOperation = props.light ? 'source-over' : 'lighter'
    drawRays(ctx, rect, t)
    drawHalo(ctx, rect, t)
    drawFlares(ctx, rect, t)
    ctx.globalCompositeOperation = 'source-over'
  },
})
</script>

<template>
  <canvas ref="canvas" aria-hidden="true" />
</template>
