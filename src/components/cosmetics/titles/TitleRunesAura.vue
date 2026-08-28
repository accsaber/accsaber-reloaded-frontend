<script setup lang="ts">
import { useElementCanvas } from '@/composables/useCanvasScene'
import type { TitleRunesAuraSpec } from '@/types/api/items'
import { withAlpha } from '@/utils/cosmetics/overlayCanvas'
import { pickVariant, titleAuraRect, type TitleAuraRect } from '@/utils/cosmetics/titleAura'
import { hash01, randBetween as rand } from '@/utils/random'
import { computed, useTemplateRef } from 'vue'

const props = defineProps<{
  aura: TitleRunesAuraSpec
  light: boolean
}>()

const palette = computed(() => {
  const a = props.aura
  return {
    color: pickVariant(props.light, a.lightColor, a.color, '#c4b5fd'),
    glow: pickVariant(props.light, a.lightGlow, a.glow, '#7c3aed'),
  }
})

const RUNES: number[][][] = [
  [[0.5, 0], [0.5, 1]],
  [[0.2, 1], [0.2, 0], [0.8, 0.35], [0.2, 0.7]],
  [[0.2, 0], [0.2, 1], [0.8, 0.3]],
  [[0.5, 0], [0.15, 1]],
  [[0.15, 0], [0.85, 1], [0.85, 0], [0.15, 1]],
  [[0.5, 0], [0.5, 1], [0.15, 0.3], [0.5, 0.6], [0.85, 0.3]],
  [[0.2, 0.2], [0.8, 0.2], [0.5, 1]],
]

interface Rune {
  shape: number[][]
  phase: number
  speed: number
  size: number
  flicker: number
  tilt: number
}

let rect: TitleAuraRect | null = null
let runes: Rune[] = []

function makeRune(i: number): Rune {
  return {
    shape: RUNES[Math.floor(hash01(i * 17 + 3) * RUNES.length)],
    phase: (i / 7) * Math.PI * 2 + rand(-0.2, 0.2),
    speed: rand(0.25, 0.45) * (i % 2 ? 1 : -1),
    size: rand(0.45, 0.7),
    flicker: rand(0, 10),
    tilt: rand(-0.4, 0.4),
  }
}

function drawRune(ctx: CanvasRenderingContext2D, r: Rune, x: number, y: number, s: number, a: number): void {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(r.tilt)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (const pass of [0, 1]) {
    ctx.strokeStyle = withAlpha(pass ? palette.value.color : palette.value.glow, pass ? a : a * 0.5)
    ctx.lineWidth = pass ? Math.max(1, s * 0.12) : Math.max(2, s * 0.3)
    ctx.beginPath()
    r.shape.forEach((p, i) => (i ? ctx.lineTo((p[0] - 0.5) * s, (p[1] - 0.5) * s) : ctx.moveTo((p[0] - 0.5) * s, (p[1] - 0.5) * s)))
    ctx.stroke()
  }
  ctx.restore()
}

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')

useElementCanvas(canvasRef, {
  init() {
    rect = canvasRef.value ? titleAuraRect(canvasRef.value) : null
    runes = Array.from({ length: props.aura.count ?? 7 }, (_, i) => makeRune(i))
  },
  draw(ctx, w, h, now, reduced) {
    ctx.clearRect(0, 0, w, h)
    if (!rect) return
    const t = reduced ? 4 : now / 1000
    const cx = rect.x + rect.w / 2
    const cy = rect.y + rect.h / 2
    const rx = rect.w / 2 + rect.fs * 0.5
    const ry = rect.h / 2 + rect.fs * 0.45
    ctx.globalCompositeOperation = props.light ? 'source-over' : 'lighter'
    for (const r of runes) {
      const ang = r.phase + t * r.speed
      const x = cx + Math.cos(ang) * rx
      const y = cy + Math.sin(ang) * ry
      const fl = 0.35 + 0.65 * Math.max(0, Math.sin(t * 2.3 + r.flicker) * Math.sin(t * 5.1 + r.flicker * 0.7))
      const depth = 0.55 + 0.45 * (Math.sin(ang) + 1) / 2
      drawRune(ctx, r, x, y, rect.fs * r.size * depth, fl * depth)
    }
    ctx.globalCompositeOperation = 'source-over'
  },
})
</script>

<template>
  <canvas ref="canvas" aria-hidden="true" />
</template>
