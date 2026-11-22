<script setup lang="ts">
import { pigments, useTitleAura } from '@/composables/useTitleAura'
import type { TitleAscensionAuraSpec } from '@/types/cosmetics/title'
import { cyc, win } from '@/utils/cosmetics/canvasShapes'
import { withAlpha } from '@/utils/cosmetics/overlayCanvas'
import type { TitleAuraRect } from '@/utils/cosmetics/titleAura'
import { randBetween as rand } from '@/utils/random'

const props = defineProps<{
  aura: TitleAscensionAuraSpec
  light: boolean
}>()

const palette = pigments(props.aura, props.light, { ray: '#f5f3ff', shine: '#ffffff' })

interface Ray {
  x: number
  width: number
  ph: number
}

interface Mote {
  x: number
  born: number
  dur: number
  size: number
  drift: number
}

let rays: Ray[] = []
let motes: Mote[] = []

function resetMote(m: Mote, rect: TitleAuraRect, now: number, warm: boolean) {
  m.x = rect.x + rand(0.05, 0.95) * rect.w
  m.born = now + (warm ? rand(-2400, 0) : rand(0, 1200))
  m.dur = rand(1800, 3000)
  m.size = rect.fs * rand(0.045, 0.08)
  m.drift = rand(-1, 1) * rect.fs * 0.2
}

useTitleAura({
  staticT: 1.2,
  additive: () => !props.light,
  layout(rect, now) {
    rays = Array.from({ length: 7 }, (_, i) => ({
      x: rect.x + ((i + 0.5) / 7) * rect.w + rand(-0.04, 0.04) * rect.w,
      width: rect.fs * rand(0.12, 0.22),
      ph: rand(0, Math.PI * 2),
    }))
    motes = Array.from({ length: 9 }, () => {
      const m = {} as Mote
      resetMote(m, rect, now, true)
      return m
    })
  },
  draw(ctx, { rect, t, now, reduced, h: ch }) {
    const { ray, shine } = palette
    const fs = rect.fs
    const e = cyc(t, 7)
    const surge = reduced ? -1 : win(e, 0.74, 0.95)
    const lift = surge >= 0 ? Math.sin(surge * Math.PI) : 0
    const bottom = rect.y + rect.h + fs * 0.25
    const top = rect.y - fs * 0.6

    const padRx = rect.w * 0.6
    const padRy = Math.min(padRx, ch - bottom)
    const pad = ctx.createRadialGradient(0, 0, 0, 0, 0, padRx)
    pad.addColorStop(0, withAlpha(ray, (props.light ? 0.14 : 0.18) + lift * 0.12))
    pad.addColorStop(1, withAlpha(ray, 0))
    ctx.save()
    ctx.translate(rect.x + rect.w / 2, bottom)
    ctx.scale(1, padRy / padRx)
    ctx.fillStyle = pad
    ctx.fillRect(-padRx, -padRx, padRx * 2, padRx * 2)
    ctx.restore()

    for (const r of rays) {
      const flicker = 0.5 + 0.3 * Math.sin(t * 1.1 + r.ph)
      const alpha = (props.light ? 0.1 : 0.13) * flicker + lift * 0.22
      const g = ctx.createLinearGradient(0, bottom, 0, top)
      g.addColorStop(0, withAlpha(ray, alpha))
      g.addColorStop(0.7, withAlpha(ray, alpha * 0.4))
      g.addColorStop(1, withAlpha(ray, 0))
      ctx.fillStyle = g
      const rw = r.width * (1 + lift * 0.5)
      ctx.fillRect(r.x - rw / 2, top, rw, bottom - top)
    }

    for (const m of motes) {
      let p = (now - m.born) / m.dur
      if (reduced) p = 0.5
      if (p >= 1) {
        resetMote(m, rect, now, false)
        continue
      }
      if (p < 0) continue
      const y = bottom - (bottom - top) * p
      const x = m.x + Math.sin(p * Math.PI * 2 + m.born) * m.drift
      const a = Math.sin(Math.PI * p) * (0.5 + lift * 0.5)
      ctx.fillStyle = withAlpha(shine, a)
      ctx.beginPath()
      ctx.arc(x, y, m.size * (1 + lift * 0.4), 0, Math.PI * 2)
      ctx.fill()
    }

    if (lift > 0.25) {
      const cx = rect.x + rect.w / 2
      const cy = rect.y + rect.h / 2
      const haloRx = rect.w * 0.55
      const haloRy = Math.min(haloRx, cy, ch - cy)
      const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, haloRx)
      halo.addColorStop(0, withAlpha(shine, (lift - 0.25) * 0.22))
      halo.addColorStop(1, withAlpha(shine, 0))
      ctx.save()
      ctx.translate(cx, cy)
      ctx.scale(1, haloRy / haloRx)
      ctx.fillStyle = halo
      ctx.fillRect(-haloRx, -haloRx, haloRx * 2, haloRx * 2)
      ctx.restore()
    }
  },
})
</script>

<template>
  <canvas ref="canvas" aria-hidden="true" />
</template>
