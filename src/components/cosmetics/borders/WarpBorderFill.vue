<script setup lang="ts">
import { useElementCanvas } from '@/composables/useCanvasScene'
import type { WarpFill } from '@/types/api/items'
import { withAlpha } from '@/utils/cosmetics/overlayCanvas'
import { randBetween as rand } from '@/utils/random'
import { useTemplateRef } from 'vue'

const props = defineProps<{
  fill: WarpFill
}>()

const STATIC_T = 4

interface Star {
  ang: number
  offset: number
  cycle: number
  size: number
  tinted: boolean
}

let stars: Star[] = []
let startTime = 0
let nextFlashAt = 0
let flashStart = -10

function seed(): void {
  stars = Array.from({ length: 110 }, () => ({
    ang: rand(0, Math.PI * 2),
    offset: rand(0, 1),
    cycle: rand(1.6, 3.4),
    size: rand(0.5, 1.4),
    tinted: Math.random() < 0.3,
  }))
}

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')

useElementCanvas(canvasRef, {
  init(_w, _h, now) {
    startTime = now
    seed()
    nextFlashAt = 4
    flashStart = -10
  },
  draw(ctx, w, h, now, reduced) {
    const t = reduced ? STATIC_T : (now - startTime) / 1000
    const speed = props.fill.speed ?? 1
    if (!reduced && t >= nextFlashAt) {
      flashStart = t
      nextFlashAt = t + rand(6, 11)
    }
    const flashAge = t - flashStart
    const surge = flashAge >= 0 && flashAge < 0.9 ? Math.sin((flashAge / 0.9) * Math.PI) : 0
    const cx = w / 2
    const cy = h / 2
    const maxR = Math.hypot(w, h) * 0.62
    const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR)
    bg.addColorStop(0, withAlpha(props.fill.core, 0.5 + surge * 0.3))
    bg.addColorStop(0.22, withAlpha(props.fill.core, 0.12 + surge * 0.14))
    bg.addColorStop(1, props.fill.space)
    ctx.fillStyle = props.fill.space
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, w, h)
    ctx.lineCap = 'round'
    const tint = props.fill.tint ?? props.fill.core
    for (const s of stars) {
      const u = ((t * speed) / s.cycle + s.offset) % 1
      const r1 = Math.pow(u, 2.1) * maxR
      const stretch = (0.05 + u * 0.24) * (1 + surge * 1.6)
      const r2 = Math.pow(Math.min(1.05, u + stretch * 0.35), 2.1) * maxR
      if (r2 <= r1 + 0.5) continue
      const a = Math.min(1, u * 3) * (0.35 + u * 0.6)
      const dx = Math.cos(s.ang)
      const dy = Math.sin(s.ang)
      const color = s.tinted ? tint : props.fill.streak
      ctx.strokeStyle = withAlpha(color, a)
      ctx.lineWidth = Math.max(0.6, s.size * (0.6 + u * 1.6) * (Math.min(w, h) / 100))
      ctx.beginPath()
      ctx.moveTo(cx + dx * r1, cy + dy * r1)
      ctx.lineTo(cx + dx * r2, cy + dy * r2)
      ctx.stroke()
    }
    const corePulse = 0.75 + 0.25 * Math.sin(t * 3.1) + surge
    const coreR = Math.min(w, h) * 0.1 * (1 + surge * 0.5)
    const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR * 2.4)
    core.addColorStop(0, withAlpha(props.fill.flare ?? '#ffffff', Math.min(1, 0.85 * corePulse)))
    core.addColorStop(0.35, withAlpha(props.fill.core, Math.min(1, 0.5 * corePulse)))
    core.addColorStop(1, withAlpha(props.fill.core, 0))
    ctx.fillStyle = core
    ctx.fillRect(cx - coreR * 2.4, cy - coreR * 2.4, coreR * 4.8, coreR * 4.8)
    if (surge > 0.02) {
      ctx.fillStyle = withAlpha(props.fill.flare ?? '#ffffff', surge * 0.12)
      ctx.fillRect(0, 0, w, h)
    }
  },
})
</script>

<template>
  <canvas ref="canvas" class="warp-border-fill" aria-hidden="true" />
</template>

<style scoped>
.warp-border-fill {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  max-width: none;
  max-height: none;
  pointer-events: none;
}
</style>
