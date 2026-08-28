<script setup lang="ts">
import { useElementCanvas } from '@/composables/useCanvasScene'
import type { TitleAscensionAuraSpec } from '@/types/api/items'
import { cyc, win } from '@/utils/cosmetics/canvasShapes'
import { withAlpha } from '@/utils/cosmetics/overlayCanvas'
import { pickVariant, titleAuraRect, type TitleAuraRect } from '@/utils/cosmetics/titleAura'
import { randBetween as rand } from '@/utils/random'
import { computed, useTemplateRef } from 'vue'

const props = defineProps<{
  aura: TitleAscensionAuraSpec
  light: boolean
}>()

const palette = computed(() => {
  const a = props.aura
  return {
    ray: pickVariant(props.light, a.lightRay, a.ray, '#f5f3ff'),
    shine: pickVariant(props.light, a.lightShine, a.shine, '#ffffff'),
  }
})

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

let rect: TitleAuraRect | null = null
let cw = 0
let ch = 0
let rays: Ray[] = []
let motes: Mote[] = []

function resetMote(m: Mote, now: number, warm: boolean) {
  if (!rect) return
  m.x = rect.x + rand(0.05, 0.95) * rect.w
  m.born = now + (warm ? rand(-2400, 0) : rand(0, 1200))
  m.dur = rand(1800, 3000)
  m.size = rect.fs * rand(0.045, 0.08)
  m.drift = rand(-1, 1) * rect.fs * 0.2
}

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')

useElementCanvas(canvasRef, {
  init(w, h, now) {
    if (!canvasRef.value) return
    rect = titleAuraRect(canvasRef.value)
    cw = w
    ch = h
    rays = Array.from({ length: 7 }, (_, i) => ({
      x: rect!.x + ((i + 0.5) / 7) * rect!.w + rand(-0.04, 0.04) * rect!.w,
      width: rect!.fs * rand(0.12, 0.22),
      ph: rand(0, Math.PI * 2),
    }))
    motes = Array.from({ length: 9 }, () => {
      const m = {} as Mote
      resetMote(m, now, true)
      return m
    })
  },
  draw(ctx, w, h, now, reduced) {
    if (!rect) return
    ctx.clearRect(0, 0, w, h)
    const { ray, shine } = palette.value
    const fs = rect.fs
    const t = reduced ? 1.2 : now / 1000
    const e = cyc(t, 7)
    const surge = reduced ? -1 : win(e, 0.74, 0.95)
    const lift = surge >= 0 ? Math.sin(surge * Math.PI) : 0
    const bottom = rect.y + rect.h + fs * 0.25
    const top = rect.y - fs * 0.6

    ctx.globalCompositeOperation = props.light ? 'source-over' : 'lighter'

    const pad = ctx.createRadialGradient(
      rect.x + rect.w / 2, bottom, 0,
      rect.x + rect.w / 2, bottom, rect.w * 0.6,
    )
    pad.addColorStop(0, withAlpha(ray, (props.light ? 0.14 : 0.18) + lift * 0.12))
    pad.addColorStop(1, withAlpha(ray, 0))
    ctx.fillStyle = pad
    ctx.fillRect(0, 0, cw, ch)

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
        resetMote(m, now, false)
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
      const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, rect.w * 0.55)
      halo.addColorStop(0, withAlpha(shine, (lift - 0.25) * 0.22))
      halo.addColorStop(1, withAlpha(shine, 0))
      ctx.fillStyle = halo
      ctx.fillRect(0, 0, cw, ch)
    }

    ctx.globalCompositeOperation = 'source-over'
  },
})
</script>

<template>
  <canvas ref="canvas" aria-hidden="true" />
</template>
