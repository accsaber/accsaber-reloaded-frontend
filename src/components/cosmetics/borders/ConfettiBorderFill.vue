<script setup lang="ts">
import { useElementCanvas } from '@/composables/useCanvasScene'
import type { ConfettiFill } from '@/types/api/items'
import { withAlpha } from '@/utils/cosmetics/overlayCanvas'
import { randBetween as rand } from '@/utils/random'
import { useTemplateRef } from 'vue'

const props = defineProps<{
  fill: ConfettiFill
}>()

const STATIC_T = 4

interface Piece {
  x: number
  y: number
  speed: number
  sway: number
  phase: number
  spin: number
  size: number
  colorIdx: number
}

interface Pop {
  born: number
  x: number
  y: number
}

let pieces: Piece[] = []
let pops: Pop[] = []
let nextPopAt = 0
let startTime = 0

function seed(): void {
  const n = props.fill.count ?? 42
  pieces = Array.from({ length: n }, (_, i) => ({
    x: rand(0, 100),
    y: rand(0, 100),
    speed: rand(4, 11),
    sway: rand(1.5, 4),
    phase: rand(0, 6.28),
    spin: rand(1.5, 5),
    size: rand(1.4, 2.6),
    colorIdx: i % props.fill.colors.length,
  }))
  pops = []
}

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')

useElementCanvas(canvasRef, {
  init(_w, _h, now) {
    startTime = now
    seed()
    nextPopAt = 2
  },
  draw(ctx, w, h, now, reduced) {
    const t = reduced ? STATIC_T : (now - startTime) / 1000
    ctx.fillStyle = props.fill.dark
    ctx.fillRect(0, 0, w, h)
    const ux = w / 100
    const uy = h / 100
    for (const p of pieces) {
      const y = ((p.y + t * p.speed) % 112) - 6
      const x = p.x + Math.sin(t * 1.1 + p.phase) * p.sway
      const ang = t * p.spin + p.phase
      const wob = Math.abs(Math.sin(t * 2.4 + p.phase))
      ctx.save()
      ctx.translate(x * ux, y * uy)
      ctx.rotate(ang)
      ctx.fillStyle = withAlpha(props.fill.colors[p.colorIdx], 0.9)
      ctx.fillRect((-p.size / 2) * ux, (-p.size * 0.3 * (0.3 + wob * 0.7)) * uy, p.size * ux, p.size * 0.6 * (0.3 + wob * 0.7) * uy)
      ctx.restore()
    }
    if (!reduced) {
      pops = pops.filter((p) => t - p.born < 0.5)
      if (t >= nextPopAt) {
        pops.push({ born: t, x: rand(10, 90), y: rand(10, 90) })
        nextPopAt = t + rand(1.8, 4.5)
      }
    }
    for (const p of pops) {
      const u = (t - p.born) / 0.5
      const a = Math.pow(1 - u, 1.5)
      const flash = props.fill.flash ?? '#ffffff'
      const g = ctx.createRadialGradient(p.x * ux, p.y * uy, 0, p.x * ux, p.y * uy, 16 * ux)
      g.addColorStop(0, withAlpha(flash, 0.8 * a))
      g.addColorStop(1, withAlpha(flash, 0))
      ctx.fillStyle = g
      ctx.fillRect((p.x - 16) * ux, (p.y - 16) * uy, 32 * ux, 32 * uy)
    }
  },
})
</script>

<template>
  <canvas ref="canvas" class="confetti-border-fill" aria-hidden="true" />
</template>

<style scoped>
.confetti-border-fill {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  max-width: none;
  max-height: none;
  pointer-events: none;
}
</style>
