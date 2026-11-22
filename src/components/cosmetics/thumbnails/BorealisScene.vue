<script setup lang="ts">
import { useElementCanvas } from '@/composables/useCanvasScene'
import type { BorealisScene } from '@/types/cosmetics/background'
import { drawAuroraCurtain } from '@/utils/cosmetics/aurora'
import type { Ctx } from '@/utils/cosmetics/canvasShapes'
import { drawStarField, layeredWave, offscreenLayer, starField, type FieldStar } from '@/utils/cosmetics/sceneLayer'
import { useTemplateRef } from 'vue'

const props = defineProps<{ scene: BorealisScene }>()

const STATIC_T = 5
const STARS = 46
const SPEED = 0.55

let unit = 1
let sky: HTMLCanvasElement | null = null
let land: HTMLCanvasElement | null = null
let stars: FieldStar[] = []

function paintSky(ctx: Ctx, w: number, h: number): void {
  const g = ctx.createLinearGradient(0, 0, 0, h)
  g.addColorStop(0, props.scene.skyTop)
  g.addColorStop(1, props.scene.skyBottom)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
}

function paintRidge(ctx: Ctx, w: number, h: number, level: number, rise: number, seed: number, color: string): void {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(0, h)
  for (let x = 0; x <= w; x += unit * 2) ctx.lineTo(x, h * level - layeredWave((x / w) * 4, seed) * unit * rise)
  ctx.lineTo(w, h)
  ctx.closePath()
  ctx.fill()
}

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')

useElementCanvas(canvasRef, {
  init(w, h, _nowMs, scale) {
    unit = Math.min(w, h) / 110
    stars = starField(STARS, w, h * 0.8, unit)
    const [skyLayer, sctx] = offscreenLayer(w, h, scale)
    if (sctx) paintSky(sctx, w, h)
    sky = skyLayer
    const [landLayer, lctx] = offscreenLayer(w, h, scale)
    if (lctx) paintRidge(lctx, w, h, 0.86, 7, 0.31, props.scene.ridge)
    land = landLayer
  },
  draw(ctx, w, h, now, reduced) {
    const t = reduced ? STATIC_T : (now / 1000) * SPEED
    ctx.clearRect(0, 0, w, h)
    if (sky) ctx.drawImage(sky, 0, 0, w, h)
    drawStarField(ctx, stars, t / SPEED, props.scene.star)
    ctx.globalCompositeOperation = 'lighter'
    props.scene.colors.forEach((color, k) => {
      drawAuroraCurtain(
        ctx,
        { left: -w * 0.2, span: w * 1.1, base: h * (0.84 - k * 0.13), reach: h * (0.95 - k * 0.12), sway: h * 0.55, step: Math.max(2, w / 150), edge: 1.6 },
        t,
        k,
        color,
      )
    })
    ctx.globalCompositeOperation = 'source-over'
    if (land) ctx.drawImage(land, 0, 0, w, h)
  },
})
</script>

<template>
  <canvas ref="canvas" aria-hidden="true" />
</template>
