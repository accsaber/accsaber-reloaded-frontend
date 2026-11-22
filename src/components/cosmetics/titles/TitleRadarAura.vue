<script setup lang="ts">
import { pigments, useTitleAura } from '@/composables/useTitleAura'
import type { TitleRadarAuraSpec } from '@/types/cosmetics/title'
import { withAlpha } from '@/utils/cosmetics/overlayCanvas'
import { randBetween as rand } from '@/utils/random'

const props = defineProps<{
  aura: TitleRadarAuraSpec
  light: boolean
}>()

interface Blip {
  ang: number
  dist: number
}

const palette = pigments(props.aura, props.light, { sweep: '#5eead4', blip: '#ecfeff' })

let blips: Blip[] = []

useTitleAura({
  additive: () => !props.light,
  init() {
    blips = Array.from({ length: 6 }, () => ({ ang: rand(0, Math.PI * 2), dist: rand(0.35, 0.95) }))
  },
  draw(ctx, { rect: r, t }) {
    const period = props.aura.periodS ?? 5
    const cx = r.x + r.w / 2
    const cy = r.y + r.h * 0.55
    const rx = r.w * 0.62
    const ry = r.h * 0.85 + r.fs * 0.5
    const sweep = ((t % period) / period) * Math.PI * 2
    ctx.save()
    ctx.translate(cx, cy)
    ctx.scale(1, ry / rx)
    for (const ringR of [0.5, 0.78, 1]) {
      ctx.strokeStyle = withAlpha(palette.sweep, 0.14)
      ctx.lineWidth = Math.max(0.6, r.fs * 0.035)
      ctx.beginPath()
      ctx.arc(0, 0, rx * ringR, 0, Math.PI * 2)
      ctx.stroke()
    }
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2
      ctx.strokeStyle = withAlpha(palette.sweep, 0.2)
      ctx.beginPath()
      ctx.moveTo(Math.cos(a) * rx * 0.96, Math.sin(a) * rx * 0.96)
      ctx.lineTo(Math.cos(a) * rx * 1.02, Math.sin(a) * rx * 1.02)
      ctx.stroke()
    }
    const trail = 1.1
    for (let s = 0; s < 18; s++) {
      const a0 = sweep - (s / 18) * trail
      ctx.strokeStyle = withAlpha(palette.sweep, 0.3 * (1 - s / 18))
      ctx.lineWidth = Math.max(0.8, r.fs * 0.05)
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(Math.cos(a0) * rx, Math.sin(a0) * rx)
      ctx.stroke()
    }
    for (const b of blips) {
      let d = sweep - b.ang
      while (d < 0) d += Math.PI * 2
      const fade = Math.max(0, 1 - d / 3.4)
      if (fade < 0.03) continue
      const bx = Math.cos(b.ang) * rx * b.dist
      const by = Math.sin(b.ang) * rx * b.dist
      ctx.fillStyle = withAlpha(palette.blip, 0.85 * fade)
      ctx.beginPath()
      ctx.arc(bx, by, Math.max(1, r.fs * 0.07), 0, Math.PI * 2)
      ctx.fill()
      if (d < 0.35) {
        ctx.strokeStyle = withAlpha(palette.blip, 0.5 * (1 - d / 0.35))
        ctx.lineWidth = Math.max(0.5, r.fs * 0.03)
        ctx.beginPath()
        ctx.arc(bx, by, r.fs * (0.1 + d * 0.6), 0, Math.PI * 2)
        ctx.stroke()
      }
    }
    ctx.restore()
  },
})
</script>

<template>
  <canvas ref="canvas" aria-hidden="true" />
</template>
