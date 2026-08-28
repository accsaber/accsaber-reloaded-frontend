<script setup lang="ts">
import { useElementCanvas } from '@/composables/useCanvasScene'
import type { TitleVoidAuraSpec } from '@/types/api/items'
import { withAlpha } from '@/utils/cosmetics/overlayCanvas'
import { pickVariant, titleAuraRect, type TitleAuraRect } from '@/utils/cosmetics/titleAura'
import { hash01 } from '@/utils/random'
import { computed, useTemplateRef } from 'vue'

const props = defineProps<{
  aura: TitleVoidAuraSpec
  light: boolean
}>()

const palette = computed(() => ({
  color: pickVariant(props.light, props.aura.lightColor, props.aura.color, '#1a0b2e'),
  rim: pickVariant(props.light, props.aura.lightRim, props.aura.rim, '#a78bfa'),
}))

let rect: TitleAuraRect | null = null

function drawSwirl(ctx: CanvasRenderingContext2D, r: TitleAuraRect, t: number): void {
  const cx = r.x + r.w / 2
  const cy = r.y + r.h / 2
  ctx.save()
  ctx.translate(cx, cy)
  ctx.scale(1, 0.6)
  const outer = r.w * 0.5 + r.fs * 0.55
  const body = ctx.createRadialGradient(0, 0, 0, 0, 0, outer)
  body.addColorStop(0, withAlpha(palette.value.color, 0.9))
  body.addColorStop(0.55, withAlpha(palette.value.color, 0.55))
  body.addColorStop(1, withAlpha(palette.value.color, 0))
  ctx.fillStyle = body
  ctx.fillRect(-outer, -outer, outer * 2, outer * 2)
  ctx.lineCap = 'round'
  for (let arm = 0; arm < 3; arm++) {
    ctx.strokeStyle = withAlpha(palette.value.rim, 0.35)
    ctx.lineWidth = Math.max(0.6, r.fs * 0.05)
    ctx.beginPath()
    for (let k = 0; k <= 40; k++) {
      const u = k / 40
      const a = u * Math.PI * 2.4 + arm * 2.09 - t * 0.9
      const rad = outer * (0.12 + u * 0.85)
      const x = Math.cos(a) * rad
      const y = Math.sin(a) * rad
      if (k === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
  }
  ctx.restore()
}

function drawHorizon(ctx: CanvasRenderingContext2D, r: TitleAuraRect, t: number): void {
  const cx = r.x + r.w / 2
  const cy = r.y + r.h / 2
  const pulse = 0.9 + 0.1 * Math.sin(t * 2.2)
  ctx.strokeStyle = withAlpha(palette.value.rim, 0.75)
  ctx.lineWidth = Math.max(0.8, r.fs * 0.045)
  ctx.beginPath()
  ctx.ellipse(cx, cy, (r.w / 2 + r.fs * 0.3) * pulse, (r.h / 2 + r.fs * 0.25) * pulse, 0, 0, Math.PI * 2)
  ctx.stroke()
}

function drawInfall(ctx: CanvasRenderingContext2D, r: TitleAuraRect, t: number): void {
  const cx = r.x + r.w / 2
  const cy = r.y + r.h / 2
  for (let i = 0; i < 22; i++) {
    const life = 2.2 + hash01(i * 3) * 1.5
    const u = ((t / life) + hash01(i * 7)) % 1
    const a = hash01(i * 11) * Math.PI * 2 + u * 4 - t * 0.3
    const rad = (1 - u) * (r.w * 0.6 + r.fs * 0.8) + r.fs * 0.15
    const x = cx + Math.cos(a) * rad
    const y = cy + Math.sin(a) * rad * 0.6
    ctx.fillStyle = withAlpha(palette.value.rim, 0.25 + 0.6 * u)
    ctx.beginPath()
    ctx.arc(x, y, r.fs * (0.02 + 0.03 * (1 - u)), 0, Math.PI * 2)
    ctx.fill()
  }
}

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')

useElementCanvas(canvasRef, {
  init() {
    rect = canvasRef.value ? titleAuraRect(canvasRef.value) : null
  },
  draw(ctx, w, h, now, reduced) {
    ctx.clearRect(0, 0, w, h)
    if (!rect) return
    const t = reduced ? 3 : now / 1000
    drawSwirl(ctx, rect, t)
    drawInfall(ctx, rect, t)
    drawHorizon(ctx, rect, t)
  },
})
</script>

<template>
  <canvas ref="canvas" aria-hidden="true" />
</template>
