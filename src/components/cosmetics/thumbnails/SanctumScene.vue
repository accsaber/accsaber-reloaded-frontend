<script setup lang="ts">
import { useElementCanvas } from '@/composables/useCanvasScene'
import type { SanctumScene } from '@/types/api/items'
import { cyc, win } from '@/utils/cosmetics/canvasShapes'
import { withAlpha } from '@/utils/cosmetics/overlayCanvas'
import { sinHash01 } from '@/utils/random'
import { useTemplateRef } from 'vue'

const props = defineProps<{ scene: SanctumScene }>()

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')

useElementCanvas(canvasRef, {
  init() {},
  draw(ctx, w, h, now, reduced) {
    const t = reduced ? 4.2 : now / 1000
    const e = cyc(t, 7)
    const ign = reduced ? -1 : win(e, 0.74, 0.95)
    const lit = ign >= 0 ? Math.sin(ign * Math.PI) : 0
    const s = Math.min(w, h) / 140
    const sc = props.scene

    ctx.clearRect(0, 0, w, h)
    const bg = ctx.createLinearGradient(0, 0, 0, h)
    bg.addColorStop(0, sc.wallTop)
    bg.addColorStop(1, sc.wallBottom)
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, w, h)

    for (let i = 0; i < 3; i++) {
      const cx = (0.22 + i * 0.28) * w
      const shaft = ctx.createLinearGradient(0, 0, 0, h)
      shaft.addColorStop(0, withAlpha(sc.shaft, 0.1 + lit * 0.08))
      shaft.addColorStop(1, withAlpha(sc.shaft, 0))
      ctx.fillStyle = shaft
      ctx.beginPath()
      ctx.moveTo(cx - 8 * s, 0)
      ctx.lineTo(cx + 8 * s, 0)
      ctx.lineTo(cx + 22 * s, h)
      ctx.lineTo(cx - 22 * s, h)
      ctx.fill()
    }

    const glowDot = (x: number, y: number, r: number, color: string, a: number) => {
      const pr = Math.max(1, r * s)
      const g = ctx.createRadialGradient(x, y, 0, x, y, pr)
      g.addColorStop(0, color)
      g.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.globalAlpha = Math.max(0, Math.min(1, a))
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(x, y, pr, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
    }

    const moteColor = sc.mote ?? sc.shaft
    for (let m = 0; m < 12; m++) {
      const sx = (0.22 + (m % 3) * 0.28) * w + (sinHash01(m) - 0.5) * 26 * s
      const sy = ((sinHash01(m + 20) + t * 0.02 * (0.5 + sinHash01(m + 5))) % 1) * h
      glowDot(sx, h - sy, 3, moteColor, 0.25 + 0.15 * Math.sin(t * 2 + m))
    }

    const tx = w / 2
    ctx.fillStyle = sc.throne
    ctx.beginPath()
    ctx.moveTo(tx - 30 * s, h)
    ctx.lineTo(tx - 30 * s, h - 48 * s)
    ctx.bezierCurveTo(tx - 34 * s, h - 76 * s, tx - 14 * s, h - 86 * s, tx, h - 88 * s)
    ctx.bezierCurveTo(tx + 14 * s, h - 86 * s, tx + 34 * s, h - 76 * s, tx + 30 * s, h - 48 * s)
    ctx.lineTo(tx + 30 * s, h)
    ctx.fill()
    ctx.strokeStyle = withAlpha(sc.rim, 0.55 + lit * 0.45)
    ctx.lineWidth = Math.max(1, 1.4 * s)
    ctx.beginPath()
    ctx.moveTo(tx - 30 * s, h - 48 * s)
    ctx.bezierCurveTo(tx - 34 * s, h - 76 * s, tx - 14 * s, h - 86 * s, tx, h - 88 * s)
    ctx.bezierCurveTo(tx + 14 * s, h - 86 * s, tx + 34 * s, h - 76 * s, tx + 30 * s, h - 48 * s)
    ctx.stroke()

    if (ign >= 0) {
      const gx = tx - 30 * s + 60 * s * ign
      const gy = h - 88 * s + 30 * s * Math.pow(Math.abs(ign - 0.5) * 2, 2)
      glowDot(gx, gy, 8, '#ffffff', 0.9)
    }

    for (let sp = 0; sp < 3; sp++) {
      const sxx = tx + (sp - 1) * 24 * s
      const syy = h - 60 * s - Math.abs(sp - 1) * 18 * s
      const size = Math.pow(Math.max(0, Math.sin(t * 1.3 + sp * 2.6)), 3) * 2.6 * s * (1 + lit)
      if (size > 0.4) {
        ctx.strokeStyle = 'rgba(255,255,255,0.9)'
        ctx.lineWidth = Math.max(1, s)
        ctx.beginPath()
        ctx.moveTo(sxx - size, syy)
        ctx.lineTo(sxx + size, syy)
        ctx.moveTo(sxx, syy - size)
        ctx.lineTo(sxx, syy + size)
        ctx.stroke()
      }
    }
  },
})
</script>

<template>
  <canvas ref="canvas" class="sanctum-scene" aria-hidden="true" />
</template>

<style scoped>
.sanctum-scene {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  max-width: none;
  max-height: none;
  pointer-events: none;
}
</style>
