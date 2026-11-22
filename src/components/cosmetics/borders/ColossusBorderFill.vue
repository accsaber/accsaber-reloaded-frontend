<script setup lang="ts">
import { useElementCanvas } from '@/composables/useCanvasScene'
import type { ColossusFill } from '@/types/cosmetics/border'
import { cyc, win } from '@/utils/cosmetics/canvasShapes'
import { overlaySpace, withAlpha } from '@/utils/cosmetics/overlayCanvas'
import { blitSceneLayer, drawGlow, paintSceneLayer } from '@/utils/cosmetics/sceneLayer'
import { sinHash01 } from '@/utils/random'
import { useTemplateRef } from 'vue'

const props = defineProps<{
  fill: ColossusFill
  margin?: number
}>()

const MARGIN = props.margin ?? 25
const LO = -MARGIN
const SPAN = 100 + MARGIN * 2

const BH = 15
const BW = 26
const ROWS = Math.ceil(SPAN / BH) + 1
const COLS = Math.ceil(SPAN / BW) + 1
const BAKE_MIN_SCALE = 1.25

let wall: HTMLCanvasElement | null = null

function paintWall(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  seams?: { column: (row: number, col: number) => void; row: (row: number) => void },
) {
  const { s, toX, toY } = overlaySpace(w, h, MARGIN)
  const block = props.fill.block
  ctx.clearRect(0, 0, w, h)
  const bg = ctx.createLinearGradient(0, 0, w, h)
  bg.addColorStop(0, props.fill.stoneA)
  bg.addColorStop(1, props.fill.stoneB)
  ctx.fillStyle = bg
  ctx.fillRect(-w * 0.05, -h * 0.05, w * 1.1, h * 1.1)
  for (let row = 0; row < ROWS; row++) {
    const y = LO + row * BH
    const off = (row % 2) * (BW / 2)
    for (let col = -1; col < COLS; col++) {
      const x = LO + col * BW + off
      ctx.fillStyle = withAlpha(block, 0.55 + 0.06 * sinHash01(row * 9 + col + 30))
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
      seams?.column(row, col)
    }
    seams?.row(row)
  }
}

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')

useElementCanvas(canvasRef, {
  init() {
    wall = null
  },
  draw(ctx, w, h, now, reduced) {
    const t = reduced ? 4.2 : now / 1000
    const interval = props.fill.intervalS ?? 8
    const e = cyc(t, interval)
    const charge = reduced ? -1 : win(e, 0.84, 0.94)
    const thunk = reduced ? -1 : win(e, 0.94, 0.99)
    const { s, toX, toY } = overlaySpace(w, h, MARGIN)
    const seam = props.fill.seam

    const R = charge >= 0 ? charge * 160 : -1
    const seamInk = (x: number, y: number, base: number) => {
      let a = base
      if (R >= 0) {
        const d = Math.hypot(x - 50, y - 50)
        a += Math.exp(-Math.pow((d - R) / 9, 2)) * 0.85
      }
      return withAlpha(seam, Math.min(1, a))
    }
    const seamLine = (ink: string, x0: number, y0: number, x1: number, y1: number) => {
      ctx.strokeStyle = ink
      ctx.lineWidth = Math.max(1, s * 1.2)
      ctx.beginPath()
      ctx.moveTo(toX(x0), toY(y0))
      ctx.lineTo(toX(x1), toY(y1))
      ctx.stroke()
    }
    const seams = {
      column(row: number, col: number) {
        const y = LO + row * BH
        const vx = LO + col * BW + (row % 2) * (BW / 2) + BW
        seamLine(seamInk(vx, y + BH / 2, 0.14 + 0.08 * Math.sin(t * 0.9 + col * 1.7)), vx, y + 2, vx, y + BH - 2)
      },
      row(row: number) {
        const y = LO + row * BH
        const base = 0.16 + 0.1 * Math.sin(t * 1.1 + row * 1.3)
        const ink = R < 0 ? seamInk(0, 0, base) : null
        for (let sx = 0; sx <= SPAN; sx += 6) {
          const x = LO + sx
          seamLine(ink ?? seamInk(x + 3, y, base), x, y, x + 6, y)
        }
      },
    }

    ctx.save()
    if (thunk >= 0 || s < BAKE_MIN_SCALE) {
      if (thunk >= 0) {
        const k = 1 + 0.02 * Math.sin(thunk * Math.PI)
        ctx.translate(w / 2, h / 2)
        ctx.scale(k, k)
        ctx.translate(-w / 2, -h / 2)
      }
      paintWall(ctx, w, h, seams)
    } else {
      wall ??= paintSceneLayer(ctx, (layer) => paintWall(layer, w, h))
      blitSceneLayer(ctx, wall)
      for (let row = 0; row < ROWS; row++) {
        for (let col = -1; col < COLS; col++) seams.column(row, col)
        seams.row(row)
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
      ctx.globalAlpha = ga
      drawGlow(ctx, px, py, gr, seam, 'rgba(0,0,0,0)')
      ctx.globalAlpha = 1
    }

    if (thunk >= 0) {
      ctx.fillStyle = withAlpha(props.fill.flash ?? '#dbe7f5', 0.18 * (1 - thunk))
      ctx.fillRect(0, 0, w, h)
    }
    ctx.restore()
  },
})
</script>

<template>
  <canvas ref="canvas" class="fx-canvas" aria-hidden="true" />
</template>
