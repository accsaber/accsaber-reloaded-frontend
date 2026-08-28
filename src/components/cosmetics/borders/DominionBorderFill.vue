<script setup lang="ts">
import { useElementCanvas } from '@/composables/useCanvasScene'
import type { DominionFill } from '@/types/api/items'
import { luminance } from '@/utils/color'
import { cyc, win } from '@/utils/cosmetics/canvasShapes'
import { overlaySpace, withAlpha } from '@/utils/cosmetics/overlayCanvas'
import { sinHash01 } from '@/utils/random'
import { useTemplateRef } from 'vue'

const props = defineProps<{
  fill: DominionFill
}>()

const MARGIN = 25

function splitDir(i: number, n: number): [number, number] {
  const ang = (i / Math.max(1, n)) * Math.PI * 2 - Math.PI / 2
  return [Math.cos(ang), Math.sin(ang)]
}

const KNOTS: [number, number][] = [
  [16, 22],
  [86, 14],
  [90, 82],
  [12, 76],
]

function fissionAmt(e: number): number {
  const split = win(e, 0.6, 0.72)
  const hold = win(e, 0.72, 0.82)
  const fuse = win(e, 0.82, 0.92)
  if (split >= 0) return 1 - Math.pow(1 - split, 3)
  if (hold >= 0) return 1
  if (fuse >= 0) return 1 - Math.pow(fuse, 2)
  return 0
}

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')

useElementCanvas(canvasRef, {
  init() {},
  draw(ctx, w, h, now, reduced) {
    const t = reduced ? 2 : now / 1000
    const interval = props.fill.intervalS ?? 5
    const micro = props.fill.microS ?? 1.9
    const e = cyc(t, interval)
    const amt = reduced ? 0 : fissionAmt(e)
    const flash = reduced ? -1 : win(e, 0.92, 1)
    const colors = props.fill.colors
    const body = props.fill.body ?? '#ffffff'
    const space = props.fill.space ?? '#050508'
    const additive = luminance(space) < 0.5
    const blend = additive ? 'lighter' : 'source-over'
    const { s, toX, toY } = overlaySpace(w, h, MARGIN)

    ctx.clearRect(0, 0, w, h)
    ctx.fillStyle = space
    ctx.fillRect(0, 0, w, h)

    const drawBody = (dx: number, dy: number, color: string, alpha: number) => {
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha))
      const bx = toX(50 + dx)
      const by = toY(38 + dy)
      const core = ctx.createRadialGradient(bx, by, 0, bx, by, Math.max(4, 95 * s))
      core.addColorStop(0, color)
      core.addColorStop(0.55, withAlpha(color, 0.55))
      core.addColorStop(1, withAlpha(color, 0.1))
      ctx.fillStyle = core
      ctx.fillRect(0, 0, w, h)
      for (let k = 0; k < KNOTS.length; k++) {
        const kx = toX(KNOTS[k][0] + dx)
        const ky = toY(KNOTS[k][1] + dy)
        const kr = Math.max(2, (10 + 3 * Math.sin(t * 1.1 + k * 1.6)) * s)
        const kg = ctx.createRadialGradient(kx, ky, 0, kx, ky, kr)
        kg.addColorStop(0, color)
        kg.addColorStop(1, withAlpha(color, 0))
        ctx.fillStyle = kg
        ctx.beginPath()
        ctx.arc(kx, ky, kr, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
    }

    if (amt > 0.02) {
      ctx.globalCompositeOperation = blend
      for (let i = 0; i < colors.length; i++) {
        const dir = splitDir(i, colors.length)
        const wob = Math.sin(t * 3.1 + i * 2.2) * 1.6 * amt
        const dx = dir[0] * 7.5 * amt + wob * dir[1]
        const dy = dir[1] * 7.5 * amt + wob * dir[0]
        drawBody(dx, dy, colors[i], 0.5)
      }
      ctx.globalCompositeOperation = 'source-over'
      drawBody(0, 0, body, Math.max(0.03, 0.5 * (1 - amt)))
    } else {
      drawBody(0, 0, body, 0.85 + 0.09 * Math.sin(t * 1.1))
      if (!reduced && flash < 0) {
        const tearCycle = Math.floor(t / micro)
        const tb = win(cyc(t, micro), 0.72, 0.94)
        if (tb >= 0) {
          const ta = Math.sin(tb * Math.PI)
          const dirx = sinHash01(tearCycle + 5) > 0.5 ? 1 : -1
          ctx.globalCompositeOperation = blend
          drawBody(dirx * 2.6 * ta, -1.4 * ta, colors[0], 0.3 * ta)
          drawBody(-dirx * 2.6 * ta, 1.4 * ta, colors[colors.length - 1], 0.3 * ta)
          ctx.globalCompositeOperation = 'source-over'
        }
      }
    }

    if (flash >= 0) {
      const fl = Math.sin(flash * Math.PI)
      ctx.fillStyle = withAlpha(body, fl * 0.55)
      ctx.fillRect(0, 0, w, h)
    }
  },
})
</script>

<template>
  <canvas ref="canvas" class="dominion-border-fill" aria-hidden="true" />
</template>

<style scoped>
.dominion-border-fill {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  max-width: none;
  max-height: none;
  pointer-events: none;
}
</style>
