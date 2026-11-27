<script setup lang="ts">
import { useElementCanvas } from '@/composables/useCanvasScene'
import type { KnitFill } from '@/types/cosmetics/border'
import type { Ctx } from '@/utils/cosmetics/canvasShapes'
import { paintKnit } from '@/utils/cosmetics/knit'
import { enterUnitSpace } from '@/utils/cosmetics/overlayCanvas'
import { useTemplateRef } from 'vue'

const props = defineProps<{
  fill: KnitFill
  margin?: number
}>()

const MARGIN = props.margin ?? 25
function paint(ctx: Ctx, w: number, h: number): void {
  ctx.save()
  enterUnitSpace(ctx, w, h, MARGIN)
  paintKnit(ctx, props.fill, { x0: -MARGIN, y0: -MARGIN, x1: 100 + MARGIN, y1: 100 + MARGIN })
  ctx.restore()
}

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')

useElementCanvas(canvasRef, {
  animated: false,
  draw: paint,
})
</script>

<template>
  <canvas ref="canvas" class="fx-canvas" aria-hidden="true" />
</template>
