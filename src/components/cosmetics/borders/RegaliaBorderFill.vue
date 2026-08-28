<script setup lang="ts">
import { useElementCanvas } from '@/composables/useCanvasScene'
import type { RegaliaFill } from '@/types/api/items'
import { cyc, win } from '@/utils/cosmetics/canvasShapes'
import { overlaySpace, withAlpha } from '@/utils/cosmetics/overlayCanvas'
import { sinHash01 } from '@/utils/random'
import { useTemplateRef } from 'vue'

const props = defineProps<{
  fill: RegaliaFill
}>()

const MARGIN = 25
const LO = -MARGIN
const HI = 100 + MARGIN
const SPAN = HI - LO

interface Ribbon {
  y0: number
  slope: number
  amp: number
  f: number
  sp: number
  ph: number
}

const RIBBONS: Ribbon[] = [
  { y0: 8, slope: 0.22, amp: 8, f: 0.05, sp: 0.22, ph: 0 },
  { y0: 50, slope: -0.14, amp: 10, f: 0.045, sp: -0.17, ph: 2.1 },
  { y0: 94, slope: 0.18, amp: 8, f: 0.052, sp: 0.15, ph: 4.2 },
]

function ribbonY(r: Ribbon, x: number, t: number): number {
  return r.y0 + (x - 50) * r.slope + Math.sin(x * r.f + t * r.sp + r.ph) * r.amp
}

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')

useElementCanvas(canvasRef, {
  init() {},
  draw(ctx, w, h, now, reduced) {
    const t = reduced ? 4.2 : now / 1000
    const interval = props.fill.intervalS ?? 7
    const e = cyc(t, interval)
    const wave = reduced ? -1 : win(e, 0.72, 0.96)
    const glint = reduced ? -1 : win(cyc(t, 4.6), 0.6, 1)
    const { s, toX, toY } = overlaySpace(w, h, MARGIN)

    ctx.clearRect(0, 0, w, h)
    const bg = ctx.createLinearGradient(0, 0, w, h)
    bg.addColorStop(0, props.fill.sheen)
    bg.addColorStop(0.55, props.fill.steel)
    bg.addColorStop(1, props.fill.shadow)
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, w, h)

    ctx.lineCap = 'round'
    const trace = (r: Ribbon, s0: number, s1: number) => {
      ctx.beginPath()
      for (let j = s0; j <= s1; j++) {
        const q = j / 30
        const x = LO + q * SPAN
        const y = ribbonY(r, x, t)
        if (j === s0) ctx.moveTo(toX(x), toY(y))
        else ctx.lineTo(toX(x), toY(y))
      }
    }

    for (let i = 0; i < RIBBONS.length; i++) {
      const r = RIBBONS[i]
      trace(r, 0, 30)
      ctx.strokeStyle = props.fill.shadow
      ctx.lineWidth = Math.max(2, 18 * s)
      ctx.stroke()
      trace(r, 0, 30)
      ctx.strokeStyle = props.fill.body
      ctx.lineWidth = Math.max(2, 12 * s)
      ctx.stroke()
      trace(r, 0, 30)
      ctx.strokeStyle = props.fill.silver
      ctx.lineWidth = Math.max(1, 6 * s)
      ctx.stroke()

      const core = props.fill.core ?? '#ffffff'
      let coreA = 0.55 + 0.15 * Math.sin(t * 0.7 + i * 2)
      if (glint >= 0) coreA += Math.exp(-Math.pow((glint - (0.25 + i * 0.25)) * 6, 2)) * 0.45
      trace(r, 0, 30)
      ctx.strokeStyle = withAlpha(core, Math.min(1, coreA))
      ctx.lineWidth = Math.max(1, 2 * s)
      ctx.stroke()

      if (wave >= 0) {
        const ws = Math.floor(wave * 30)
        trace(r, Math.max(0, ws - 4), Math.min(30, ws + 4))
        ctx.strokeStyle = withAlpha(core, 0.95)
        ctx.lineWidth = Math.max(2, 7 * s)
        ctx.stroke()
      }
    }

    for (let sk = 0; sk < 6; sk++) {
      const r = RIBBONS[sk % RIBBONS.length]
      const q = sinHash01(sk + 12)
      const x = LO + q * SPAN
      const y = ribbonY(r, x, t)
      const boost = wave >= 0 ? 1.8 : 1
      const size = Math.pow(Math.max(0, Math.sin(t * 1.2 + sk * 2.4)), 3) * 2.6 * boost * s
      if (size > 0.4) {
        ctx.strokeStyle = withAlpha(props.fill.core ?? '#ffffff', 0.95)
        ctx.lineWidth = Math.max(1, s)
        ctx.beginPath()
        ctx.moveTo(toX(x) - size, toY(y))
        ctx.lineTo(toX(x) + size, toY(y))
        ctx.moveTo(toX(x), toY(y) - size)
        ctx.lineTo(toX(x), toY(y) + size)
        ctx.stroke()
      }
    }
  },
})
</script>

<template>
  <canvas ref="canvas" class="regalia-border-fill" aria-hidden="true" />
</template>

<style scoped>
.regalia-border-fill {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  max-width: none;
  max-height: none;
  pointer-events: none;
}
</style>
