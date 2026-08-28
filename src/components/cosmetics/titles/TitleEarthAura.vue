<script setup lang="ts">
import { useElementCanvas } from '@/composables/useCanvasScene'
import type { TitleEarthAuraSpec } from '@/types/api/items'
import { darken, lighten } from '@/utils/color'
import { withAlpha } from '@/utils/cosmetics/overlayCanvas'
import { pickVariant, titleAuraRect, type TitleAuraRect } from '@/utils/cosmetics/titleAura'
import { hash01, randBetween as rand } from '@/utils/random'
import { computed, useTemplateRef } from 'vue'

const props = defineProps<{
  aura: TitleEarthAuraSpec
  light: boolean
}>()

const palette = computed(() => ({
  stone: pickVariant(props.light, props.aura.lightStone, props.aura.stone, '#8a7a62'),
  dust: pickVariant(props.light, props.aura.lightDust, props.aura.dust, '#c9a86a'),
}))

interface Stone {
  phase: number
  speed: number
  size: number
  spin: number
  sides: number
  bob: number
}

interface Mote {
  x: number
  y: number
  speed: number
  size: number
}

let rect: TitleAuraRect | null = null
let stones: Stone[] = []
let motes: Mote[] = []

function makeStone(i: number, n: number): Stone {
  return { phase: (i / n) * Math.PI * 2, speed: rand(0.3, 0.5) * (i % 2 ? 1 : -1), size: rand(0.22, 0.4), spin: rand(-1.2, 1.2), sides: 5 + Math.floor(hash01(i * 3) * 3), bob: rand(0, 6.28) }
}

function drawStone(ctx: CanvasRenderingContext2D, st: Stone, x: number, y: number, s: number, t: number, depth: number): void {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(t * st.spin)
  ctx.beginPath()
  for (let k = 0; k < st.sides; k++) {
    const a = (k / st.sides) * Math.PI * 2
    const r = s * (0.8 + 0.25 * hash01(k * 7 + st.sides))
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r)
  }
  ctx.closePath()
  ctx.fillStyle = withAlpha(palette.value.stone, depth)
  ctx.fill()
  ctx.strokeStyle = withAlpha(lighten(palette.value.stone, 0.35), 0.6 * depth)
  ctx.lineWidth = Math.max(0.6, s * 0.12)
  ctx.stroke()
  ctx.strokeStyle = withAlpha(darken(palette.value.stone, 0.5), 0.7 * depth)
  ctx.beginPath()
  ctx.moveTo(-s * 0.4, -s * 0.1)
  ctx.lineTo(s * 0.1, s * 0.15)
  ctx.lineTo(s * 0.35, -s * 0.2)
  ctx.stroke()
  ctx.restore()
}

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')

useElementCanvas(canvasRef, {
  init() {
    rect = canvasRef.value ? titleAuraRect(canvasRef.value) : null
    const n = props.aura.count ?? 5
    stones = Array.from({ length: n }, (_, i) => makeStone(i, n))
    motes = Array.from({ length: 14 }, () => ({ x: rand(0, 1), y: rand(0, 1), speed: rand(0.04, 0.09), size: rand(0.03, 0.06) }))
  },
  draw(ctx, w, h, now, reduced) {
    ctx.clearRect(0, 0, w, h)
    if (!rect) return
    const t = reduced ? 3 : now / 1000
    const cx = rect.x + rect.w / 2
    const cy = rect.y + rect.h / 2
    const rx = rect.w / 2 + rect.fs * 0.55
    const ry = rect.h / 2 + rect.fs * 0.5
    for (const m of motes) {
      const y = (m.y + t * m.speed) % 1
      const x = m.x + Math.sin(t * 0.8 + m.y * 9) * 0.02
      ctx.fillStyle = withAlpha(palette.value.dust, 0.35 * Math.sin(y * Math.PI))
      ctx.beginPath()
      ctx.arc(rect.x + rect.w * x, rect.y - rect.fs * 0.6 + (rect.h + rect.fs * 1.2) * y, rect.fs * m.size, 0, Math.PI * 2)
      ctx.fill()
    }
    for (const st of stones) {
      const ang = st.phase + t * st.speed
      const depth = 0.55 + 0.45 * (Math.sin(ang) + 1) / 2
      const x = cx + Math.cos(ang) * rx
      const y = cy + Math.sin(ang) * ry + Math.sin(t * 1.4 + st.bob) * rect.fs * 0.06
      drawStone(ctx, st, x, y, rect.fs * st.size * depth, t, depth)
    }
  },
})
</script>

<template>
  <canvas ref="canvas" aria-hidden="true" />
</template>
