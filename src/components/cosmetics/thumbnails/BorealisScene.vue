<script setup lang="ts">
import { useElementCanvas } from '@/composables/useCanvasScene'
import type { BorealisScene } from '@/types/cosmetics/background'
import { drawAuroraLayer } from '@/utils/cosmetics/aurora'
import { drawStarField, offscreenLayer, paintRidge, paintSky, starField, type FieldStar } from '@/utils/cosmetics/sceneLayer'
import { useTemplateRef } from 'vue'

const props = defineProps<{ scene: BorealisScene }>()

const STATIC_T = 5
const STARS = 46
const SPEED = 0.55
const CURTAIN_SCALE = 0.5

let unit = 1
let sky: HTMLCanvasElement | null = null
let land: HTMLCanvasElement | null = null
let curtains: HTMLCanvasElement | null = null
let stars: FieldStar[] = []

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')

useElementCanvas(canvasRef, {
  init(w, h, _nowMs, scale) {
    unit = Math.min(w, h) / 110
    stars = starField(STARS, w, h * 0.8, unit)
    const [skyLayer, sctx] = offscreenLayer(w, h, scale)
    if (sctx) paintSky(sctx, w, h, [props.scene.skyTop, props.scene.skyBottom])
    sky = skyLayer
    const [landLayer, lctx] = offscreenLayer(w, h, scale)
    if (lctx) paintRidge(lctx, w, h, unit, 0.86, 7, 0.31, props.scene.ridge)
    land = landLayer
    curtains = offscreenLayer(w, h, CURTAIN_SCALE)[0]
  },
  draw(ctx, w, h, now, reduced) {
    const t = reduced ? STATIC_T : (now / 1000) * SPEED
    ctx.clearRect(0, 0, w, h)
    if (sky) ctx.drawImage(sky, 0, 0, w, h)
    drawStarField(ctx, stars, t / SPEED, props.scene.star)
    if (curtains) {
      drawAuroraLayer(ctx, curtains, w, h, t, props.scene.colors, (k) => ({
        left: -w * 0.1, span: w * 1.2, base: h * (0.84 - k * 0.13), reach: h * (0.95 - k * 0.12), sway: h * 0.55, step: 1 / CURTAIN_SCALE, edge: 1.6,
      }), props.scene.hues)
    }
    if (land) ctx.drawImage(land, 0, 0, w, h)
  },
})
</script>

<template>
  <canvas ref="canvas" aria-hidden="true" />
</template>
