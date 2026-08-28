<script setup lang="ts">
import { useElementCanvas } from '@/composables/useCanvasScene'
import type { GroveFill } from '@/types/api/items'
import { cyc, win } from '@/utils/cosmetics/canvasShapes'
import { overlaySpace, withAlpha } from '@/utils/cosmetics/overlayCanvas'
import { sinHash01 } from '@/utils/random'
import { useTemplateRef } from 'vue'

const props = defineProps<{
  fill: GroveFill
}>()

const MARGIN = 25
const LO = -MARGIN
const HI = 100 + MARGIN
const SPAN = HI - LO

const VINE_ROWS = 6
const FRUIT_COUNT = 12
const FIREFLY_COUNT = 12
const SPORE_COUNT = 10

function vineY(row: number, s: number, t: number): number {
  return LO + 6 + row * (SPAN / VINE_ROWS)
    + Math.sin(s * 5.4 + row * 1.8 + t * 0.6) * 8
}

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')

useElementCanvas(canvasRef, {
  init() {},
  draw(ctx, w, h, now, reduced) {
    const t = reduced ? 4.2 : now / 1000
    const interval = props.fill.intervalS ?? 9
    const e = cyc(t, interval)
    const boost = win(e, 0.8, 0.93)
    const b = boost >= 0 && !reduced ? Math.sin(boost * Math.PI) : 0
    const { s, toX, toY } = overlaySpace(w, h, MARGIN)

    ctx.clearRect(0, 0, w, h)
    const bg = ctx.createLinearGradient(0, 0, w, h)
    bg.addColorStop(0, props.fill.deep)
    bg.addColorStop(1, props.fill.moss)
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, w, h)

    ctx.lineWidth = Math.max(1, s * 1.2)
    ctx.strokeStyle = withAlpha(props.fill.vine, 0.9)
    ctx.lineCap = 'round'
    for (let row = 0; row < VINE_ROWS; row++) {
      ctx.beginPath()
      for (let j = 0; j <= 30; j++) {
        const q = j / 30
        const x = LO + q * SPAN
        const y = vineY(row, q, t)
        if (j === 0) ctx.moveTo(toX(x), toY(y))
        else ctx.lineTo(toX(x), toY(y))
      }
      ctx.stroke()
    }

    const glowDot = (x: number, y: number, r: number, color: string, a: number) => {
      const px = toX(x)
      const py = toY(y)
      const pr = Math.max(1, r * s * 3)
      const g = ctx.createRadialGradient(px, py, 0, px, py, pr)
      g.addColorStop(0, color)
      g.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.globalAlpha = Math.max(0, Math.min(1, a))
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(px, py, pr, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
    }

    const fruits = props.fill.fruits
    for (let i = 0; i < FRUIT_COUNT; i++) {
      const q = sinHash01(i + 4)
      const row = i % VINE_ROWS
      const x = LO + q * SPAN
      const y = vineY(row, q, t) + 4
      const col = fruits[i % fruits.length]
      const pulse = 0.5 + 0.45 * Math.sin(t * 1.6 + i * 1.7) + b * 0.8
      glowDot(x, y, 1, col, Math.min(1, pulse))
      ctx.fillStyle = col
      ctx.beginPath()
      ctx.arc(toX(x), toY(y), Math.max(1, (1.5 + b) * s), 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,0.8)'
      ctx.beginPath()
      ctx.arc(toX(x - 0.5), toY(y - 0.5), Math.max(0.5, 0.5 * s), 0, Math.PI * 2)
      ctx.fill()
    }

    const mushroomA = props.fill.mushroomA ?? '#5ce0c8'
    const mushroomB = props.fill.mushroomB ?? '#b07ce8'
    for (let cluster = 0; cluster < 3; cluster++) {
      const mx = LO + (0.16 + cluster * 0.34) * SPAN
      const my = HI - 12
      for (let cap = 0; cap < 3; cap++) {
        const cx = mx + (cap - 1) * 5
        const cyv = my - (cap === 1 ? 3 : 0)
        const col = (cap + cluster) % 2 ? mushroomB : mushroomA
        glowDot(cx, cyv, 0.8, col, 0.35 + 0.2 * Math.sin(t * 0.9 + cap + cluster * 3) + b * 0.4)
        ctx.fillStyle = col
        ctx.beginPath()
        ctx.arc(toX(cx), toY(cyv), Math.max(1, 1.8 * s), Math.PI, 0)
        ctx.fill()
      }
    }

    const firefly = props.fill.firefly
    const fireflyAlt = props.fill.fireflyAlt ?? firefly
    for (let f = 0; f < FIREFLY_COUNT; f++) {
      const x = LO + sinHash01(f + 40) * SPAN + Math.sin(t * 0.8 + f * 1.7) * 11
      const y = LO + sinHash01(f + 80) * SPAN + Math.sin(t * 0.6 + f * 2.3) * 8
      const col = f % 3 === 0 ? fireflyAlt : firefly
      const fl = 0.4 + 0.45 * Math.sin(t * 3.2 + f * 2.4) + b * 0.5
      glowDot(x, y, 0.8, col, Math.max(0.12, fl))
    }

    const spore = props.fill.spore ?? '#c8e6c8'
    for (let sp = 0; sp < SPORE_COUNT; sp++) {
      const x = LO + sinHash01(sp + 60) * SPAN + Math.sin(t * 0.9 + sp) * 4
      const y = HI - ((t * 3.2 + sp * 17) % SPAN)
      ctx.fillStyle = withAlpha(spore, 0.3 + 0.18 * Math.sin(t * 1.4 + sp))
      ctx.fillRect(toX(x), toY(y), Math.max(1, s * 1.6), Math.max(1, s * 1.6))
    }
  },
})
</script>

<template>
  <canvas ref="canvas" class="grove-border-fill" aria-hidden="true" />
</template>

<style scoped>
.grove-border-fill {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  max-width: none;
  max-height: none;
  pointer-events: none;
}
</style>
