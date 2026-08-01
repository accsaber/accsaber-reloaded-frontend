<script setup lang="ts">
import { useElementCanvas } from '@/composables/useBackdropCanvas'
import type { MonumentScene } from '@/types/api/items'
import { withAlpha } from '@/utils/overlayCanvas'
import { useTemplateRef } from 'vue'

const props = defineProps<{ scene: MonumentScene }>()

function hash(i: number): number {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.545
  return x - Math.floor(x)
}

function cyc(t: number, p: number): number {
  return ((t % p) + p) % p / p
}

function win(c: number, a: number, b: number): number {
  return c >= a && c < b ? (c - a) / (b - a) : -1
}

const WIDTHS = [0.72, 0.56, 0.4, 0.26, 0.13]

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')

useElementCanvas(canvasRef, {
  init() {},
  draw(ctx, w, h, now, reduced) {
    const t = reduced ? 4.2 : now / 1000
    const e = cyc(t, 8)
    const s = Math.min(w, h) / 140
    const sc = props.scene
    const edge = sc.edge ?? sc.seam

    ctx.clearRect(0, 0, w, h)
    const bg = ctx.createLinearGradient(0, 0, 0, h)
    bg.addColorStop(0, sc.skyTop)
    bg.addColorStop(1, sc.skyBottom)
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, w, h)

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

    const cloudColor = sc.cloud ?? edge
    for (let cl = 0; cl < 2; cl++) {
      const clx = ((t * (2.2 + cl) * s) % (w + 90 * s)) - 45 * s
      const cly = (16 + cl * 15) * s
      ctx.save()
      ctx.translate(clx, cly)
      ctx.scale(4.5, 1)
      const cg = ctx.createRadialGradient(0, 0, 0, 0, 0, 9 * s)
      cg.addColorStop(0, withAlpha(cloudColor, 0.1))
      cg.addColorStop(1, withAlpha(cloudColor, 0))
      ctx.fillStyle = cg
      ctx.beginPath()
      ctx.arc(0, 0, 9 * s, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }

    for (let b = 0; b < 3; b++) {
      const bx = ((hash(b + 3) + t * 0.008 * (1 + b * 0.3)) % 1.1) * w
      ctx.fillStyle = withAlpha(sc.stone, 0.7)
      ctx.fillRect(bx, (18 + b * 9) * s, 3 * s, Math.max(1, s))
    }

    const tierH = 17 * s
    for (let i = 0; i < WIDTHS.length; i++) {
      const tw = WIDTHS[i] * w
      const ty = h - (i + 1) * tierH
      const lx = (w - tw) / 2
      ctx.fillStyle = sc.stone
      ctx.fillRect(lx, ty, tw, tierH + 1)
      ctx.strokeStyle = withAlpha(edge, 0.22)
      ctx.lineWidth = Math.max(1, s)
      ctx.beginPath()
      ctx.moveTo(lx, ty + 0.5)
      ctx.lineTo(lx + tw, ty + 0.5)
      ctx.stroke()
      const chg = reduced ? -1 : win(e, 0.8 + i * 0.03, 0.8 + i * 0.03 + 0.08)
      const glow = 0.1 + 0.05 * Math.sin(t * 0.8 + i) + (chg >= 0 ? Math.sin(chg * Math.PI) * 0.8 : 0)
      ctx.strokeStyle = withAlpha(sc.seam, Math.min(1, glow))
      ctx.beginPath()
      ctx.moveTo(w / 2, ty + 2)
      ctx.lineTo(w / 2, ty + tierH - 2)
      ctx.moveTo(lx + 6 * s, ty + 2)
      ctx.lineTo(lx + 6 * s, ty + tierH - 2)
      ctx.moveTo(lx + tw - 6 * s, ty + 2)
      ctx.lineTo(lx + tw - 6 * s, ty + tierH - 2)
      ctx.stroke()
    }

    if (!reduced) {
      const per = 6
      for (let bk = 0; bk < 3; bk++) {
        const u = ((t / per) + bk / 3) % 1
        const cycId = Math.floor(t / per) * 3 + bk
        const tier = Math.floor(hash(cycId + 11) * 4)
        const slotX = w / 2 + (hash(cycId + 23) - 0.5) * WIDTHS[tier] * w * 0.6
        const slotY = h - (tier + 1) * tierH + 6 * s
        const side = hash(cycId + 37) > 0.5 ? w * 0.06 : w * 0.94
        if (u < 0.72) {
          const pr = u / 0.72
          const ease = 1 - Math.pow(1 - pr, 3)
          const bx = side + (slotX - side) * ease
          const by = h + 4 * s + (slotY - h - 4 * s) * ease + Math.sin(t * 2 + bk) * 1.2 * s
          ctx.fillStyle = sc.stone
          ctx.fillRect(bx - 5 * s, by - 3 * s, 10 * s, 6 * s)
          ctx.strokeStyle = withAlpha(edge, 0.3)
          ctx.lineWidth = Math.max(1, s)
          ctx.strokeRect(bx - 5 * s, by - 3 * s, 10 * s, 6 * s)
          glowDot(bx, by + 5 * s, 8, sc.seam, 0.5)
        } else if (u < 0.82) {
          const fl = Math.sin(((u - 0.72) / 0.1) * Math.PI)
          glowDot(slotX, slotY, 10 + fl * 6, edge, fl)
        }
      }
    }

    const apex = reduced ? -1 : win(e, 0.95, 1)
    const base = 0.25 + 0.1 * Math.sin(t * 1.1)
    glowDot(
      w / 2,
      h - WIDTHS.length * tierH - 4 * s,
      8 + (apex >= 0 ? 10 * Math.sin(apex * Math.PI) : 0),
      edge,
      apex >= 0 ? 1 : base,
    )
  },
})
</script>

<template>
  <canvas ref="canvas" class="monument-scene" aria-hidden="true" />
</template>

<style scoped>
.monument-scene {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  max-width: none;
  max-height: none;
  pointer-events: none;
}
</style>
