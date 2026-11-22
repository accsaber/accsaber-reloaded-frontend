<script setup lang="ts">
import { pigments, useTitleAura } from '@/composables/useTitleAura'
import type { TitleWindAuraSpec } from '@/types/cosmetics/title'
import { frameDelta, withAlpha } from '@/utils/cosmetics/overlayCanvas'
import type { TitleAuraRect } from '@/utils/cosmetics/titleAura'
import { randBetween as rand } from '@/utils/random'

const props = defineProps<{
  aura: TitleWindAuraSpec
  light: boolean
}>()

const palette = pigments(props.aura, props.light, { color: '#c8ece0', leaf: '#7cb342' })

interface Streak {
  y: number
  born: number
  life: number
  len: number
  wave: number
}

interface Leaf {
  born: number
  life: number
  y0: number
  spin: number
  size: number
}

let streaks: Streak[] = []
let leaves: Leaf[] = []
let nextStreak = 0
let nextLeaf = 1
let last = 0
let clock = 0

function gust(t: number): number {
  const every = (props.aura.gustMs ?? 6000) / 1000
  const local = t % every
  return local > every * 0.55 && local < every * 0.55 + 1.4 ? Math.sin(((local - every * 0.55) / 1.4) * Math.PI) : 0
}

function drawStreak(ctx: CanvasRenderingContext2D, s: Streak, r: TitleAuraRect): void {
  const u = (clock - s.born) / s.life
  const x0 = r.x - r.fs * 0.8 + (r.w + r.fs * 1.6 + s.len) * u - s.len
  const y = r.y + r.h * s.y
  ctx.strokeStyle = withAlpha(palette.color, 0.55 * Math.sin(u * Math.PI))
  ctx.lineWidth = Math.max(0.6, r.fs * 0.045)
  ctx.lineCap = 'round'
  ctx.beginPath()
  for (let k = 0; k <= 8; k++) {
    const kx = x0 + (k / 8) * s.len
    const ky = y + Math.sin(k * 0.8 + s.wave + clock * 3) * r.fs * 0.06
    if (k === 0) ctx.moveTo(kx, ky)
    else ctx.lineTo(kx, ky)
  }
  ctx.stroke()
}

function drawLeaf(ctx: CanvasRenderingContext2D, lf: Leaf, r: TitleAuraRect): void {
  const u = (clock - lf.born) / lf.life
  const x = r.x - r.fs * 0.9 + (r.w + r.fs * 1.8) * u
  const y = r.y + r.h * lf.y0 + Math.sin(u * 7 + lf.spin) * r.fs * 0.25 + u * r.fs * 0.3
  const s = r.fs * lf.size
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(clock * lf.spin)
  ctx.fillStyle = withAlpha(palette.leaf, 0.85 * Math.sin(u * Math.PI))
  ctx.beginPath()
  ctx.moveTo(-s, 0)
  ctx.quadraticCurveTo(0, -s * 0.9, s, 0)
  ctx.quadraticCurveTo(0, s * 0.9, -s, 0)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = withAlpha(palette.color, 0.5)
  ctx.lineWidth = Math.max(0.5, s * 0.12)
  ctx.beginPath()
  ctx.moveTo(-s * 0.8, 0)
  ctx.lineTo(s * 0.8, 0)
  ctx.stroke()
  ctx.restore()
}

useTitleAura({
  init(_rect, now) {
    last = now
  },
  layout() {
    streaks = []
  },
  draw(ctx, { rect, now, reduced }) {
    const dt = frameDelta(now, last, reduced)
    last = now
    clock = reduced ? 3 : clock + dt
    const g = gust(clock)
    if (!reduced && clock >= nextStreak) {
      streaks.push({ y: rand(-0.3, 1.2), born: clock, life: rand(0.9, 1.5) / (1 + g * 1.2), len: rect.fs * rand(1.2, 2.6), wave: rand(0, 6.28) })
      nextStreak = clock + rand(0.12, 0.35) / (1 + g * 2)
    }
    if (!reduced && clock >= nextLeaf) {
      leaves.push({ born: clock, life: rand(1.8, 2.8) / (1 + g), y0: rand(-0.2, 1), spin: rand(2, 5) * (rand(0, 1) < 0.5 ? -1 : 1), size: rand(0.12, 0.2) })
      nextLeaf = clock + rand(0.8, 2.2) / (1 + g * 2)
    }
    if (reduced && streaks.length === 0) {
      streaks = [0.1, 0.5, 0.9].map((y, i) => ({ y, born: 2.4 - i * 0.2, life: 1.2, len: rect.fs * 2, wave: i }))
    }
    streaks = streaks.filter((s) => clock - s.born < s.life)
    leaves = leaves.filter((l) => clock - l.born < l.life)
    for (const s of streaks) drawStreak(ctx, s, rect)
    for (const l of leaves) drawLeaf(ctx, l, rect)
  },
})
</script>

<template>
  <canvas ref="canvas" aria-hidden="true" />
</template>
