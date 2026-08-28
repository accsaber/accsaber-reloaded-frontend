<script setup lang="ts">
import { useElementCanvas } from '@/composables/useCanvasScene'
import type { FusionScene } from '@/types/api/items'
import { cyc, win } from '@/utils/cosmetics/canvasShapes'
import { withAlpha } from '@/utils/cosmetics/overlayCanvas'
import { sinHash01 } from '@/utils/random'
import { useTemplateRef } from 'vue'

const props = defineProps<{ scene: FusionScene }>()

function fissionAmt(e: number): number {
  const split = win(e, 0.6, 0.72)
  const hold = win(e, 0.72, 0.82)
  const fuse = win(e, 0.82, 0.92)
  if (split >= 0) return 1 - Math.pow(1 - split, 3)
  if (hold >= 0) return 1
  if (fuse >= 0) return 1 - Math.pow(fuse, 2)
  return 0
}

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')

useElementCanvas(canvasRef, {
  init() {},
  draw(ctx, w, h, now, reduced) {
    const t = reduced ? 2 : now / 1000
    const e = cyc(t, 5)
    const amt = reduced ? 0 : fissionAmt(e)
    const flash = reduced ? -1 : win(e, 0.92, 1)
    const s = Math.min(w, h) / 140
    const sc = props.scene
    const additive = sc.base !== 'light'
    const blend = additive ? 'lighter' : 'source-over'
    const y0 = h * 0.52

    ctx.clearRect(0, 0, w, h)
    ctx.fillStyle = sc.bg
    ctx.fillRect(0, 0, w, h)

    const line = (dy: number, color: string, alpha: number, lw: number, wavAmp: number, phase: number) => {
      ctx.strokeStyle = color
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha))
      ctx.lineWidth = Math.max(1, lw * s)
      ctx.beginPath()
      const step = Math.max(4, w / 60)
      for (let x = 4; x <= w - 4; x += step) {
        const y = y0 + dy + Math.sin(x * 0.045 / s + t * 2.2 + phase) * wavAmp * s
        if (x === 4) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
      ctx.globalAlpha = 1
    }

    const glowLine = (r: number, a: number) => {
      const g = ctx.createRadialGradient(w / 2, y0, 0, w / 2, y0, Math.max(4, r * s))
      g.addColorStop(0, withAlpha(sc.beam, 0.28))
      g.addColorStop(1, withAlpha(sc.beam, 0))
      ctx.globalAlpha = Math.max(0, Math.min(1, a))
      ctx.fillStyle = g
      ctx.fillRect(0, 0, w, h)
      ctx.globalAlpha = 1
    }

    const mid = (sc.colors.length - 1) / 2
    if (amt > 0.02) {
      ctx.globalCompositeOperation = blend
      for (let i = 0; i < sc.colors.length; i++) {
        line((i - mid) * 8.5 * amt * s, sc.colors[i], 0.85, 1.6, 2.4 * amt, i * 1.7)
      }
      ctx.globalCompositeOperation = 'source-over'
    } else {
      ctx.globalCompositeOperation = blend
      const fringeBase = additive ? 0.1 : 0.32
      const fringeAmp = additive ? 0.07 : 0.14
      for (let f = 0; f < sc.colors.length; f++) {
        line((f - mid) * 1.5 * s, sc.colors[f], fringeBase + fringeAmp * Math.sin(t * 1.3 + f * 1.26), 0.8, 0.7, f * 1.7)
      }
      ctx.globalCompositeOperation = 'source-over'
    }

    const wAlpha = amt > 0.02 ? Math.max(0.05, 0.9 * (1 - amt)) : 0.8 + 0.12 * Math.sin(t * 0.9)
    glowLine(26, wAlpha * 0.55)
    line(0, sc.beam, wAlpha, 1.8, 0.7, 0)

    if (!reduced && amt <= 0.02 && flash < 0) {
      const kx = w * (0.5 + 0.42 * Math.sin(t * 0.23))
      const ky = y0 + Math.sin(kx * 0.045 / s + t * 2.2) * 0.7 * s
      const kg = ctx.createRadialGradient(kx, ky, 0, kx, ky, 8 * s)
      kg.addColorStop(0, sc.beam)
      kg.addColorStop(1, withAlpha(sc.beam, 0))
      ctx.globalAlpha = 0.7 + 0.2 * Math.sin(t * 2.9)
      ctx.fillStyle = kg
      ctx.beginPath()
      ctx.arc(kx, ky, 8 * s, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1

      const tearCycle = Math.floor(t / 3.9)
      const tb = win(cyc(t, 3.9), 0.8, 0.97)
      if (tb >= 0 && sc.colors.length > 1) {
        const ta = Math.sin(tb * Math.PI)
        const tx0 = (0.12 + sinHash01(tearCycle + 3) * 0.7) * w
        ctx.globalCompositeOperation = blend
        ctx.globalAlpha = ta * 0.85
        ctx.strokeStyle = sc.colors[0]
        ctx.lineWidth = Math.max(1, 1.1 * s)
        ctx.beginPath()
        ctx.moveTo(tx0, y0 - 2.6 * s)
        ctx.lineTo(tx0 + 22 * s, y0 - 2.6 * s)
        ctx.stroke()
        ctx.strokeStyle = sc.colors[sc.colors.length - 1]
        ctx.beginPath()
        ctx.moveTo(tx0, y0 + 2.6 * s)
        ctx.lineTo(tx0 + 22 * s, y0 + 2.6 * s)
        ctx.stroke()
        ctx.globalAlpha = 1
        ctx.globalCompositeOperation = 'source-over'
      }
    }

    if (flash >= 0) {
      const fl = Math.sin(flash * Math.PI)
      line(0, sc.beam, fl, 2 + fl * 4, 0.4, 0)
      glowLine(40 + fl * 30, fl * 0.8)
    }
  },
})
</script>

<template>
  <canvas ref="canvas" class="fusion-scene" aria-hidden="true" />
</template>

<style scoped>
.fusion-scene {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  max-width: none;
  max-height: none;
  pointer-events: none;
}
</style>
