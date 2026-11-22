<script setup lang="ts">
import { useElementCanvas } from '@/composables/useCanvasScene'
import type { KnitFill } from '@/types/cosmetics/border'
import type { Ctx } from '@/utils/cosmetics/canvasShapes'
import { enterUnitSpace } from '@/utils/cosmetics/overlayCanvas'
import { useTemplateRef } from 'vue'

const props = defineProps<{
  fill: KnitFill
  margin?: number
}>()

const MARGIN = props.margin ?? 25
const MOTIF = [
  '........',
  'x.x.x.x.',
  '.x.x.x.x',
  '........',
  '...x....',
  '..x.x...',
  '.x.x.x..',
  '..x.x...',
  '...x....',
  '........',
  'x...x...',
  '........',
  '..x...x.',
  '.x.x.x.x',
  'x...x...',
  '........',
  '........',
  '.x.x.x.x',
  'x.x.x.x.',
  '........',
]

function stitches(ctx: Ctx, size: number, motif: boolean): void {
  const pad = Math.ceil(MARGIN / size)
  const n = Math.ceil(100 / size) + pad
  ctx.beginPath()
  for (let row = -pad; row < n; row++) {
    const cells = MOTIF[(row + pad * MOTIF.length) % MOTIF.length]
    const y = row * size
    for (let col = -pad; col < n; col++) {
      if ((cells[(col + pad * cells.length) % cells.length] === 'x') !== motif) continue
      const x = col * size
      ctx.moveTo(x + size * 0.14, y + size * 0.1)
      ctx.lineTo(x + size * 0.5, y + size * 0.9)
      ctx.lineTo(x + size * 0.86, y + size * 0.1)
    }
  }
  ctx.stroke()
}

function paintKnit(ctx: Ctx, w: number, h: number): void {
  const { wool, shade, motif, stitch = 2.5 } = props.fill
  ctx.fillStyle = shade
  ctx.fillRect(0, 0, w, h)
  ctx.save()
  enterUnitSpace(ctx, w, h, MARGIN)
  ctx.lineWidth = stitch * 0.36
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = wool
  stitches(ctx, stitch, false)
  ctx.strokeStyle = motif
  stitches(ctx, stitch, true)
  ctx.restore()
}

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')

useElementCanvas(canvasRef, {
  animated: false,
  draw: paintKnit,
})
</script>

<template>
  <canvas ref="canvas" class="fx-canvas" aria-hidden="true" />
</template>
