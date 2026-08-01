<script setup lang="ts">
import { useElementCanvas } from '@/composables/useBackdropCanvas'
import type { GroveScene } from '@/types/api/items'
import { withAlpha } from '@/utils/overlayCanvas'
import { useTemplateRef } from 'vue'

const props = defineProps<{ scene: GroveScene }>()

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

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')

useElementCanvas(canvasRef, {
  init() {},
  draw(ctx, w, h, now, reduced) {
    const t = reduced ? 4.2 : now / 1000
    const e = cyc(t, 9)
    const boost = win(e, 0.8, 0.93)
    const flare = boost >= 0 && !reduced ? Math.sin(boost * Math.PI) : 0
    const s = Math.min(w, h) / 140
    const sc = props.scene
    const light = sc.base === 'light'
    const gm = light ? 0.45 : 1
    const gr = light ? 0.65 : 1

    ctx.clearRect(0, 0, w, h)
    const bg = ctx.createLinearGradient(0, 0, 0, h)
    bg.addColorStop(0, sc.skyTop)
    bg.addColorStop(1, sc.skyBottom)
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, w, h)

    const glowDot = (x: number, y: number, r: number, color: string, a: number) => {
      const pr = Math.max(1, r * s * gr)
      const g = ctx.createRadialGradient(x, y, 0, x, y, pr)
      g.addColorStop(0, color)
      g.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.globalAlpha = Math.max(0, Math.min(1, a * gm))
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(x, y, pr, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
    }

    glowDot(w * 0.72, h * 0.35, 110, withAlpha(sc.firefly, 0.5), 0.12 + flare * 0.1)
    glowDot(w * 0.18, h * 0.85, 95, withAlpha(sc.mushroomB ?? '#b07ce8', 0.5), 0.12 + flare * 0.08)

    const trunk = sc.trunk
    const trunks: [number, number][] = [[0.06, 15], [0.46, 9], [0.9, 13]]
    for (let i = 0; i < trunks.length; i++) {
      const tx = trunks[i][0] * w
      const tw = trunks[i][1] * s
      ctx.fillStyle = trunk
      ctx.fillRect(tx - tw / 2, 0, tw, h)
      ctx.strokeStyle = withAlpha(sc.fireflyAlt ?? sc.firefly, 0.12)
      ctx.lineWidth = Math.max(1, s)
      ctx.beginPath()
      ctx.moveTo(tx + tw / 2 - 1, 0)
      ctx.lineTo(tx + tw / 2 - 1, h)
      ctx.stroke()
    }

    ctx.fillStyle = trunk
    for (let cb = 0; cb < 8; cb++) {
      const bx = (cb / 7) * w
      ctx.beginPath()
      ctx.ellipse(bx, 2 * s, (28 + hash(cb) * 14) * s, (12 + hash(cb + 9) * 6) * s, 0, 0, Math.PI * 2)
      ctx.fill()
    }

    for (let vn = 0; vn < 7; vn++) {
      const vx = (0.1 + vn * 0.13) * w + hash(vn + 20) * 8 * s
      const vlen = (16 + hash(vn + 33) * 38) * s
      const sway = Math.sin(t * 0.5 + vn * 1.3) * 3 * s
      ctx.strokeStyle = withAlpha(sc.vine, 0.85)
      ctx.lineWidth = Math.max(1, 1.2 * s)
      ctx.beginPath()
      ctx.moveTo(vx, 6 * s)
      ctx.quadraticCurveTo(vx + sway * 0.4, 6 * s + vlen * 0.6, vx + sway, 6 * s + vlen)
      ctx.stroke()
      const fx = vx + sway
      const fy = 8 * s + vlen
      const col = sc.fruits[vn % sc.fruits.length]
      const pulse = 0.5 + 0.3 * Math.sin(t * 1.2 + vn * 2) + flare * 0.7
      glowDot(fx, fy, 8 + flare * 4, col, Math.min(1, pulse))
      ctx.fillStyle = col
      ctx.beginPath()
      ctx.arc(fx, fy, Math.max(1, 2 * s), 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,0.85)'
      ctx.beginPath()
      ctx.arc(fx - 0.6 * s, fy - 0.6 * s, Math.max(0.5, 0.6 * s), 0, Math.PI * 2)
      ctx.fill()
    }

    const mushroomA = sc.mushroomA ?? '#5ce0c8'
    const mushroomB = sc.mushroomB ?? '#b07ce8'
    const clusters: [number, number][] = [[0.16, 0], [0.62, 1], [0.84, 0]]
    for (let mc = 0; mc < clusters.length; mc++) {
      const mx = clusters[mc][0] * w
      for (let cap = 0; cap < 3; cap++) {
        const cx = mx + (cap - 1) * 7 * s
        const cyv = h - 6 * s - (cap === 1 ? 4 * s : 0)
        const col = (cap + clusters[mc][1]) % 2 ? mushroomB : mushroomA
        glowDot(cx, cyv, 8, col, 0.4 + 0.2 * Math.sin(t * 0.9 + cap + mc * 2) + flare * 0.4)
        ctx.fillStyle = col
        ctx.beginPath()
        ctx.arc(cx, cyv, Math.max(1, 2.4 * s), Math.PI, 0)
        ctx.fill()
        ctx.fillStyle = sc.trunk
        ctx.fillRect(cx - 0.8 * s, cyv, 1.6 * s, 3.5 * s)
      }
      glowDot(mx, h - 3 * s, 26, withAlpha(mushroomA, 0.4), 0.15 + flare * 0.15)
    }

    const wispColor = sc.wisp ?? '#bfe8ff'
    const wx = w * (0.32 + 0.24 * Math.sin(t * 0.13))
    const wy = h * (0.5 + 0.16 * Math.sin(t * 0.21 + 1))
    for (let wt = 1; wt < 5; wt++) {
      const wpx = w * (0.32 + 0.24 * Math.sin((t - wt * 0.5) * 0.13))
      const wpy = h * (0.5 + 0.16 * Math.sin((t - wt * 0.5) * 0.21 + 1))
      glowDot(wpx, wpy, 6 - wt, wispColor, (0.4 - wt * 0.08) * (1 + flare))
    }
    glowDot(wx, wy, 10, wispColor, 0.7 + flare * 0.3)
    ctx.fillStyle = '#eaf6ff'
    ctx.beginPath()
    ctx.arc(wx, wy, Math.max(1, 1.6 * s), 0, Math.PI * 2)
    ctx.fill()

    for (let ff = 0; ff < 12; ff++) {
      const px = hash(ff + 50) * w + 12 * s * Math.sin(t * 0.2 + ff)
      const py = 26 * s + hash(ff + 70) * (h - 45 * s) + 7 * s * Math.sin(t * 0.31 + ff * 2)
      const col = ff % 4 === 0 ? (sc.fireflyAlt ?? sc.firefly) : sc.firefly
      const al = 0.3 + 0.4 * Math.sin(t * 2.4 + ff * 2.2) + flare * 0.4
      glowDot(px, py, 5, col, Math.max(0.08, al))
    }

    const mistColor = sc.mist ?? '#8cc8aa'
    const mist = ctx.createLinearGradient(0, h - 34 * s, 0, h)
    mist.addColorStop(0, withAlpha(mistColor, 0))
    mist.addColorStop(1, withAlpha(mistColor, 0.09))
    ctx.fillStyle = mist
    ctx.fillRect(0, h - 34 * s, w, 34 * s)
  },
})
</script>

<template>
  <canvas ref="canvas" class="grove-scene" aria-hidden="true" />
</template>

<style scoped>
.grove-scene {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  max-width: none;
  max-height: none;
  pointer-events: none;
}
</style>
