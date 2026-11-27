<script setup lang="ts">
import { useBackdropCanvas } from '@/composables/useCanvasScene'
import { drawAuroraLayer } from '@/utils/cosmetics/aurora'
import { sceneUnit } from '@/utils/cosmetics/canvasShapes'
import { drawStarField, offscreenLayer, paintRidge, paintSky, skyStars, type FieldStar } from '@/utils/cosmetics/sceneLayer'
import type { AuroraBackdropConfig } from '@/utils/cosmetics/themeBackdrop'
import { useTemplateRef } from 'vue'

const props = defineProps<{ config: AuroraBackdropConfig }>()

const STATIC_T = 5
const SPEED = 0.4
const CURTAIN_SCALE = 0.2
const RIDGE = 0.9

let unit = 1
let base: HTMLCanvasElement | null = null
let ridge: HTMLCanvasElement | null = null
let curtains: HTMLCanvasElement | null = null
let stars: FieldStar[] = []

function layout(w: number, h: number, scale: number): void {
  unit = sceneUnit(w, h)
  stars = skyStars(w, h * RIDGE)
  const [skyLayer, sctx] = offscreenLayer(w, h, scale)
  if (sctx) paintSky(sctx, w, h, props.config.skyColors)
  base = skyLayer
  const [ridgeLayer, rctx] = offscreenLayer(w, h, scale)
  if (rctx) paintRidge(rctx, w, h, unit, RIDGE, 6, 0.31, props.config.ridgeColor)
  ridge = ridgeLayer
  curtains = offscreenLayer(w, h, CURTAIN_SCALE)[0]
}

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')

useBackdropCanvas(canvasRef, {
  init(w, h, _now, scale) {
    layout(w, h, scale)
  },
  resize(w, h, _now, scale) {
    layout(w, h, scale)
  },
  draw(ctx, w, h, now, reduced) {
    const t = reduced ? STATIC_T : now / 1000
    if (base) ctx.drawImage(base, 0, 0, w, h)
    drawStarField(ctx, stars, t, props.config.starColor)
    if (curtains) {
      drawAuroraLayer(ctx, curtains, w, h, t * SPEED, props.config.colors, (k) => ({
        left: -w * 0.1, span: w * 1.2, base: h * (0.56 - k * 0.11), reach: h * (0.56 - k * 0.06), sway: h * 1.1, step: 1 / CURTAIN_SCALE, edge: 1.2,
      }), props.config.hues)
    }
    if (ridge) ctx.drawImage(ridge, 0, 0, w, h)
  },
})
</script>

<template>
  <canvas ref="canvas" :style="{ opacity: config.opacity }" aria-hidden="true" />
</template>
