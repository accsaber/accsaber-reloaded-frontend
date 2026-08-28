<script setup lang="ts">
import { useElementCanvas } from '@/composables/useCanvasScene'
import type { ColossusFill } from '@/types/api/items'
import { cyc, win } from '@/utils/cosmetics/canvasShapes'
import { overlaySpace, withAlpha } from '@/utils/cosmetics/overlayCanvas'
import { sinHash01 } from '@/utils/random'
import { useTemplateRef } from 'vue'

const props = defineProps<{
  fill: ColossusFill
}>()

const MARGIN = 25
const LO = -MARGIN
const SPAN = 100 + MARGIN * 2

const BH = 15
const BW = 26
const ROWS = Math.ceil(SPAN / BH) + 1
const COLS = Math.ceil(SPAN / BW) + 1

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')

useElementCanvas(canvasRef, {
  init() {},
  draw(ctx, w, h, now, reduced) {
    const t = reduced ? 4.2 : now / 1000
    const interval = props.fill.intervalS ?? 8
    const e = cyc(t, interval)
    const charge = reduced ? -1 : win(e, 0.84, 0.94)
    const thunk = reduced ? -1 : win(e, 0.94, 0.99)
    const { s, toX, toY } = overlaySpace(w, h, MARGIN)
    const flash = props.fill.flash ?? '#dbe7f5'

    ctx.save()
    if (thunk >= 0) {
      const k = 1 + 0.02 * Math.sin(thunk * Math.PI)
      ctx.translate(w / 2, h / 2)
      ctx.scale(k, k)
      ctx.translate(-w / 2, -h / 2)
    }

    ctx.clearRect(0, 0, w, h)
    const bg = ctx.createLinearGradient(0, 0, w, h)
    bg.addColorStop(0, props.fill.stoneA)
    bg.addColorStop(1, props.fill.stoneB)
    ctx.fillStyle = bg
    ctx.fillRect(-w * 0.05, -h * 0.05, w * 1.1, h * 1.1)

    const R = charge >= 0 ? charge * 160 : -1
    const seamAlpha = (x: number, y: number, base: number) => {
      let a = base
      if (R >= 0) {
        const d = Math.hypot(x - 50, y - 50)
        a += Math.exp(-Math.pow((d - R) / 9, 2)) * 0.85
      }
      return Math.min(1, a)
    }

    for (let row = 0; row < ROWS; row++) {
      const y = LO + row * BH
      const off = (row % 2) * (BW / 2)
      for (let col = -1; col < COLS; col++) {
        const x = LO + col * BW + off
        const shade = 0.55 + 0.06 * sinHash01(row * 9 + col + 30)
        ctx.fillStyle = withAlpha(props.fill.block, shade)
        ctx.fillRect(toX(x + 1), toY(y + 1), (BW - 2) * s * 1.05, (BH - 2) * s * 1.05)
        ctx.strokeStyle = 'rgba(255,255,255,0.08)'
        ctx.lineWidth = Math.max(1, s * 0.8)
        ctx.beginPath()
        ctx.moveTo(toX(x + 2), toY(y + 1.6))
        ctx.lineTo(toX(x + BW - 2), toY(y + 1.6))
        ctx.stroke()
        ctx.strokeStyle = 'rgba(0,0,0,0.3)'
        ctx.beginPath()
        ctx.moveTo(toX(x + 2), toY(y + BH - 1.6))
        ctx.lineTo(toX(x + BW - 2), toY(y + BH - 1.6))
        ctx.stroke()

        const vx = x + BW + off * 0
        const va = seamAlpha(vx, y + BH / 2, 0.14 + 0.08 * Math.sin(t * 0.9 + col * 1.7))
        ctx.strokeStyle = withAlpha(props.fill.seam, va)
        ctx.lineWidth = Math.max(1, s * 1.2)
        ctx.beginPath()
        ctx.moveTo(toX(vx), toY(y + 2))
        ctx.lineTo(toX(vx), toY(y + BH - 2))
        ctx.stroke()
      }
      for (let sx = 0; sx <= SPAN; sx += 6) {
        const x = LO + sx
        const a = seamAlpha(x + 3, y, 0.16 + 0.1 * Math.sin(t * 1.1 + row * 1.3))
        ctx.strokeStyle = withAlpha(props.fill.seam, a)
        ctx.lineWidth = Math.max(1, s * 1.2)
        ctx.beginPath()
        ctx.moveTo(toX(x), toY(y))
        ctx.lineTo(toX(x + 6), toY(y))
        ctx.stroke()
      }
    }

    if (charge < 0 && thunk < 0 && !reduced) {
      const gu = cyc(t, 2.6)
      const grow = Math.floor(sinHash01(Math.floor(t / 2.6) + 3) * (ROWS - 1))
      const gx = LO + gu * SPAN
      const gy = LO + grow * BH
      const ga = Math.sin(gu * Math.PI) * 0.55
      const px = toX(gx)
      const py = toY(gy)
      const gr = Math.max(3, s * 6)
      const gg = ctx.createRadialGradient(px, py, 0, px, py, gr)
      gg.addColorStop(0, props.fill.seam)
      gg.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.globalAlpha = ga
      ctx.fillStyle = gg
      ctx.beginPath()
      ctx.arc(px, py, gr, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
    }

    if (thunk >= 0) {
      ctx.fillStyle = withAlpha(flash, 0.18 * (1 - thunk))
      ctx.fillRect(0, 0, w, h)
    }
    ctx.restore()
  },
})
</script>

<template>
  <canvas ref="canvas" class="colossus-border-fill" aria-hidden="true" />
</template>

<style scoped>
.colossus-border-fill {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  max-width: none;
  max-height: none;
  pointer-events: none;
}
</style>
