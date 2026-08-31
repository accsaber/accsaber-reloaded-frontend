<script setup lang="ts">
import { useElementCanvas } from '@/composables/useCanvasScene'
import type { HazardFill } from '@/types/api/items'
import { darken } from '@/utils/color'
import { withAlpha } from '@/utils/cosmetics/overlayCanvas'
import { hash01 } from '@/utils/random'
import { useTemplateRef } from 'vue'

const props = defineProps<{
  fill: HazardFill
}>()

const STATIC_T = 4
const ALARM_S = 7

let startTime = 0

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')

useElementCanvas(canvasRef, {
  init(_w, _h, now) {
    startTime = now
  },
  draw(ctx, w, h, now, reduced) {
    const t = reduced ? STATIC_T : (now - startTime) / 1000
    const speed = props.fill.speed ?? 6
    const stripe = Math.max(6, Math.min(w, h) * 0.14)
    const offset = (t * speed * (stripe / 10)) % (stripe * 2)
    ctx.fillStyle = props.fill.b
    ctx.fillRect(0, 0, w, h)
    ctx.save()
    ctx.translate(offset, 0)
    ctx.fillStyle = props.fill.a
    const span = w + h + stripe * 4
    for (let x = -span; x < span; x += stripe * 2) {
      ctx.beginPath()
      ctx.moveTo(x, h)
      ctx.lineTo(x + h, 0)
      ctx.lineTo(x + h + stripe, 0)
      ctx.lineTo(x + stripe, h)
      ctx.closePath()
      ctx.fill()
    }
    ctx.restore()
    for (let k = 0; k < 26; k++) {
      const sx = hash01(k * 13 + 1) * w
      const sy = hash01(k * 29 + 4) * h
      const sw = (2 + hash01(k * 7) * 8) * (w / 100)
      ctx.fillStyle = withAlpha(darken(props.fill.b, 0.4), 0.14 + hash01(k * 3) * 0.14)
      ctx.fillRect(sx, sy, sw, sw * (0.3 + hash01(k * 5) * 0.4))
    }
    const au = (t % ALARM_S) / 1.1
    if (au < 1) {
      const alarm = props.fill.alarm ?? props.fill.a
      const k = Math.sin(au * Math.PI)
      const x = au * (w + w * 0.6) - w * 0.3
      const g = ctx.createLinearGradient(x - w * 0.3, 0, x + w * 0.3, 0)
      g.addColorStop(0, withAlpha(alarm, 0))
      g.addColorStop(0.5, withAlpha(alarm, 0.3 * k))
      g.addColorStop(1, withAlpha(alarm, 0))
      ctx.fillStyle = g
      ctx.fillRect(0, 0, w, h)
    }
  },
})
</script>

<template>
  <canvas ref="canvas" class="hazard-border-fill" aria-hidden="true" />
</template>

<style scoped>
.hazard-border-fill {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  max-width: none;
  max-height: none;
  pointer-events: none;
}
</style>
