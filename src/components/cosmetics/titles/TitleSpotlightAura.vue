<script setup lang="ts">
import { useElementCanvas } from '@/composables/useCanvasScene'
import type { TitleSpotlightAuraSpec } from '@/types/api/items'
import { withAlpha } from '@/utils/cosmetics/overlayCanvas'
import { pickVariant, titleAuraRect, type TitleAuraRect } from '@/utils/cosmetics/titleAura'
import { useTemplateRef } from 'vue'

const props = defineProps<{
  aura: TitleSpotlightAuraSpec
  light: boolean
}>()

const STATIC_T = 3

let rect: TitleAuraRect | null = null

function beamColor(): string {
  return pickVariant(props.light, props.aura.lightBeam, props.aura.beam, '#fff7d6')
}

function drawBeam(ctx: CanvasRenderingContext2D, r: TitleAuraRect, ox: number, angle: number, len: number, halfW: number): void {
  const dx = Math.sin(angle)
  const dy = -Math.cos(angle)
  const px = -dy
  const py = dx
  const tipX = ox + dx * len
  const tipY = r.y + r.h + r.fs * 0.6 + dy * len
  const baseY = r.y + r.h + r.fs * 0.6
  const g = ctx.createLinearGradient(ox, baseY, tipX, tipY)
  g.addColorStop(0, withAlpha(beamColor(), 0.34))
  g.addColorStop(0.7, withAlpha(beamColor(), 0.1))
  g.addColorStop(1, withAlpha(beamColor(), 0))
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.moveTo(ox - px * halfW * 0.12, baseY - py * halfW * 0.12)
  ctx.lineTo(ox + px * halfW * 0.12, baseY + py * halfW * 0.12)
  ctx.lineTo(tipX + px * halfW, tipY + py * halfW)
  ctx.lineTo(tipX - px * halfW, tipY - py * halfW)
  ctx.closePath()
  ctx.fill()
}

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')

useElementCanvas(canvasRef, {
  init() {
    rect = canvasRef.value ? titleAuraRect(canvasRef.value) : null
  },
  draw(ctx, w, h, now, reduced) {
    ctx.clearRect(0, 0, w, h)
    if (!rect) return
    const t = reduced ? STATIC_T : now / 1000
    const period = props.aura.periodS ?? 6
    const beams = props.aura.beams ?? 2
    ctx.globalCompositeOperation = props.light ? 'source-over' : 'lighter'
    for (let b = 0; b < beams; b++) {
      const ox = rect.x + rect.w * (beams > 1 ? b / (beams - 1) : 0.5)
      const dir = b % 2 === 0 ? 1 : -1
      const angle = Math.sin((t / period) * Math.PI * 2 + b * 1.7) * 0.5 * dir
      drawBeam(ctx, rect, ox, angle, rect.h + rect.fs * 2.4, rect.fs * 0.85)
    }
    ctx.globalCompositeOperation = 'source-over'
  },
})
</script>

<template>
  <canvas ref="canvas" aria-hidden="true" />
</template>
