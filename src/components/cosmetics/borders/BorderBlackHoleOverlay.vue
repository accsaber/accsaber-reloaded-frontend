<script setup lang="ts">
import { useElementCanvas } from '@/composables/useCanvasScene'
import type { BorderBlackHoleOverlaySpec, BorderOverlayHost } from '@/types/cosmetics/border'
import { darken, lerpHex } from '@/utils/color'
import { fillMeanLuminance, frameDelta, overlaySpace, withAlpha, OVERLAY_MARGIN } from '@/utils/cosmetics/overlayCanvas'
import { randBetween as rand } from '@/utils/random'
import { computed, useTemplateRef } from 'vue'
import { fillCircle } from '@/utils/cosmetics/canvasShapes'

const props = defineProps<BorderOverlayHost & { overlay: BorderBlackHoleOverlaySpec }>()

const HOLE_X = 50
const HOLE_Y = 100
const R = 8.8
const DEFAULT_GLOW = '#ffb46b'
const TILT = -0.35
const COS_TILT = Math.cos(TILT)
const SIN_TILT = Math.sin(TILT)
const VORTEX_STEPS = 40

interface Wisp {
  angle: number
  radius: number
  angVel: number
}

let wisps: Wisp[] = []
let lastNow = 0

const vortexActive = computed(() => {
  const v = props.overlay.vortex
  if (!v) return false
  const lum = fillMeanLuminance(props.color?.states?.[0]?.fill)
  return lum != null && lum <= v.maxLuminance
})

function resetWisp(w: Wisp) {
  w.angle = rand(0, Math.PI * 2)
  w.radius = rand(15, 24)
  w.angVel = rand(1.2, 2.2)
}

const vortexInk = computed(() => {
  const hot = props.overlay.vortex?.color ?? props.overlay.glow ?? DEFAULT_GLOW
  const ember = darken(hot, 0.9)
  return Array.from({ length: VORTEX_STEPS + 1 }, (_, i) => {
    const u = i / VORTEX_STEPS
    return withAlpha(lerpHex(hot, ember, u), Math.min(1, 0.2 + 0.8 * Math.pow(1 - u, 1.1)))
  })
})

function bandX(angle: number, radius: number): number {
  return HOLE_X + Math.cos(angle) * radius * COS_TILT - Math.sin(angle) * radius * 0.42 * SIN_TILT
}

function bandY(angle: number, radius: number): number {
  return HOLE_Y + Math.cos(angle) * radius * SIN_TILT + Math.sin(angle) * radius * 0.42 * COS_TILT
}

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')

useElementCanvas(canvasRef, {
  init(_w, _h, now) {
    wisps = Array.from({ length: 12 }, () => {
      const w = { angle: 0, radius: 0, angVel: 0 }
      resetWisp(w)
      return w
    })
    lastNow = now
  },
  draw(ctx, w, h, now, reduced) {
    ctx.clearRect(0, 0, w, h)
    const { s, toX, toY } = overlaySpace(w, h, OVERLAY_MARGIN)
    const glow = props.overlay.glow ?? DEFAULT_GLOW
    const dt = frameDelta(now, lastNow, reduced)
    lastNow = now
    const t = now / 1000
    const cx = toX(HOLE_X)
    const cy = toY(HOLE_Y)
    const rp = R * s

    function strokeBandArc(from: number, to: number, width: number, alpha: number, radius: number) {
      ctx.strokeStyle = withAlpha(glow, alpha)
      ctx.lineWidth = width
      ctx.lineCap = 'round'
      ctx.beginPath()
      const steps = 22
      for (let i = 0; i <= steps; i++) {
        const a = from + ((to - from) * i) / steps
        ctx.lineTo(toX(bandX(a, radius)), toY(bandY(a, radius)))
      }
      ctx.stroke()
    }

    if (vortexActive.value) {
      const spec = props.overlay.vortex!
      const hot = spec.color ?? glow
      const ink = vortexInk.value
      const arms = spec.arms ?? 2
      const sublines = 3
      const turns = 1.15
      const rInner = R * 1.15
      const rOuter = R * 1.15 + 31
      const spin = reduced ? 0 : -t * 0.85

      const dust = ctx.createRadialGradient(cx, cy, rp * 1.1, cx, cy, rp * 4)
      dust.addColorStop(0, withAlpha(hot, 0.12))
      dust.addColorStop(1, withAlpha(hot, 0))
      ctx.fillStyle = dust
      ctx.beginPath()
      ctx.ellipse(cx, cy, rp * 4, rp * 4 * 0.5, TILT, 0, Math.PI * 2)
      ctx.fill()

      ctx.lineCap = 'round'
      for (let a = 0; a < arms; a++) {
        const armBase = (a / arms) * Math.PI * 2
        for (let sub = 0; sub < sublines; sub++) {
          const off = (sub - (sublines - 1) / 2) * 0.16
          const jitter = off * 2.2
          let prevX = 0
          let prevY = 0
          for (let i = 0; i <= VORTEX_STEPS; i++) {
            const u = i / VORTEX_STEPS
            const theta = armBase + off + spin + u * turns * Math.PI * 2
            const radius = rInner + (rOuter - rInner) * Math.pow(u, 0.85) + jitter * Math.sin(u * 8)
            const px = toX(bandX(theta, radius))
            const py = toY(bandY(theta, radius))
            if (i > 0) {
              ctx.strokeStyle = ink[i]
              ctx.lineWidth = Math.max(0.5, (2.4 - u * 2) * s)
              ctx.beginPath()
              ctx.moveTo(prevX, prevY)
              ctx.lineTo(px, py)
              ctx.stroke()
            }
            prevX = px
            prevY = py
          }
        }
      }
    }

    if (!reduced) {
      for (const wisp of wisps) {
        wisp.angle += wisp.angVel * (1 + (24 - wisp.radius) * 0.09) * dt
        wisp.radius -= (2 + (24 - wisp.radius) * 0.4) * dt
        if (wisp.radius < R * 1.05) resetWisp(wisp)
        const fade = Math.min(1, (24 - wisp.radius) / 12)
        strokeBandArc(wisp.angle - 0.5, wisp.angle, Math.max(0.8, 0.7 * s), 0.12 + 0.4 * fade, wisp.radius)
      }
    }

    const hotspot = t * 0.6

    strokeBandArc(Math.PI, Math.PI * 2, Math.max(1, 1 * s), 0.4, R * 1.55)
    if (Math.sin(hotspot) < 0) strokeBandArc(hotspot - 0.4, hotspot + 0.4, Math.max(1.2, 1.3 * s), 0.75, R * 1.55)

    const pulse = reduced ? 0.5 : 0.5 + 0.5 * Math.sin(t * 1.4)
    const halo = ctx.createRadialGradient(cx, cy, rp, cx, cy, rp * 1.45)
    halo.addColorStop(0, withAlpha(glow, 0.32 + pulse * 0.14))
    halo.addColorStop(1, withAlpha(glow, 0))
    ctx.fillStyle = halo
    fillCircle(ctx, cx, cy, rp * 1.45)

    ctx.fillStyle = '#000000'
    fillCircle(ctx, cx, cy, rp)
    ctx.strokeStyle = withAlpha(glow, 0.85 + pulse * 0.15)
    ctx.lineWidth = Math.max(1, 0.9 * s)
    ctx.beginPath()
    ctx.arc(cx, cy, rp * 1.04, 0, Math.PI * 2)
    ctx.stroke()

    strokeBandArc(0, Math.PI, Math.max(1.2, 1.4 * s), 0.85, R * 1.55)
    strokeBandArc(Math.PI * 0.72, Math.PI * 0.98, Math.max(1.4, 1.6 * s), 0.5, R * 1.55)
    if (Math.sin(hotspot) >= 0) strokeBandArc(hotspot - 0.4, hotspot + 0.4, Math.max(1.4, 1.7 * s), 0.95, R * 1.55)
  },
})
</script>

<template>
  <canvas ref="canvas" aria-hidden="true" />
</template>
