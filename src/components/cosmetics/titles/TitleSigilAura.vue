<script setup lang="ts">
import { pigments, useTitleAura } from '@/composables/useTitleAura'
import type { TitleSigilAuraSpec } from '@/types/cosmetics/title'
import { withAlpha } from '@/utils/cosmetics/overlayCanvas'

const props = defineProps<{
  aura: TitleSigilAuraSpec
  light: boolean
}>()

const { color } = pigments(props.aura, props.light, { color: '#f2c94c' })

function ring(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, width: number, alpha: number): void {
  ctx.strokeStyle = withAlpha(color, alpha)
  ctx.lineWidth = width
  ctx.beginPath()
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
  ctx.stroke()
}

function ticks(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, count: number, rot: number, len: number, alpha: number): void {
  ctx.strokeStyle = withAlpha(color, alpha)
  ctx.lineWidth = 1
  const k = 1 + len / rx
  for (let i = 0; i < count; i++) {
    const a = rot + (i / count) * Math.PI * 2
    const ca = Math.cos(a)
    const sa = Math.sin(a)
    ctx.beginPath()
    ctx.moveTo(cx + ca * rx, cy + sa * ry)
    ctx.lineTo(cx + ca * rx * k, cy + sa * ry * k)
    ctx.stroke()
  }
}

function triangle(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, rot: number, alpha: number): void {
  ctx.strokeStyle = withAlpha(color, alpha)
  ctx.lineWidth = 1
  ctx.beginPath()
  for (let i = 0; i < 3; i++) {
    const a = rot + (i / 3) * Math.PI * 2
    const x = cx + Math.cos(a) * rx
    const y = cy + Math.sin(a) * ry
    if (i) ctx.lineTo(x, y)
    else ctx.moveTo(x, y)
  }
  ctx.closePath()
  ctx.stroke()
}

useTitleAura({
  staticT: 2,
  additive: () => !props.light,
  draw(ctx, { rect, t, w, h }) {
    const period = props.aura.periodS ?? 12
    const rot = (t / period) * Math.PI * 2
    const cx = rect.x + rect.w / 2
    const cy = rect.y + rect.h * 0.62
    const R = Math.min(rect.w * 0.62 + rect.fs * 0.4, cx - 1, w - cx - 1)
    const ry = Math.min(R * 0.42, cy - 1, h - cy - 1)
    const pulse = 0.55 + 0.45 * Math.sin(t * 1.4)
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R)
    g.addColorStop(0, withAlpha(color, 0.12 * pulse))
    g.addColorStop(1, withAlpha(color, 0))
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
    ring(ctx, cx, cy, R, ry, 1.2, 0.5 + 0.3 * pulse)
    ring(ctx, cx, cy, R * 0.82, ry * 0.82, 0.8, 0.35)
    ticks(ctx, cx, cy, R * 0.82, ry * 0.82, 24, rot, R * 0.06, 0.5)
    ticks(ctx, cx, cy, R, ry, 8, -rot * 0.5, -R * 0.1, 0.6)
    triangle(ctx, cx, cy, R * 0.8, ry * 0.8, rot * 0.35, 0.45)
    triangle(ctx, cx, cy, R * 0.8, ry * 0.8, rot * 0.35 + Math.PI, 0.45)
    ring(ctx, cx, cy, R * 0.45, ry * 0.45, 0.8, 0.3 + 0.3 * pulse)
  },
})
</script>

<template>
  <canvas ref="canvas" aria-hidden="true" />
</template>
