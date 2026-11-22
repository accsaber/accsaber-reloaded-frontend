<script setup lang="ts">
import { pigments, useTitleAura } from '@/composables/useTitleAura'
import type { TitleMeadowAuraSpec } from '@/types/cosmetics/title'
import { lighten } from '@/utils/color'
import { withAlpha } from '@/utils/cosmetics/overlayCanvas'
import { randBetween as rand } from '@/utils/random'

const props = defineProps<{
  aura: TitleMeadowAuraSpec
  light: boolean
}>()

interface Blade {
  x: number
  hgt: number
  lean: number
  phase: number
  shade: number
}

interface Seed {
  born: number
  x: number
  drift: number
  phase: number
}

const palette = pigments(props.aura, props.light, { grass: '#4ade80', seed: '#f7fee7' })

let blades: Blade[] = []
let seeds: Seed[] = []

function seedBlades(): void {
  const n = props.aura.blades ?? 26
  blades = Array.from({ length: n }, () => ({
    x: rand(-0.02, 1.02),
    hgt: rand(0.45, 0.95),
    lean: rand(-0.2, 0.2),
    phase: rand(0, 6.28),
    shade: rand(-0.15, 0.3),
  }))
}

function spawnSeed(now: number): Seed {
  return { born: now, x: rand(0, 0.8), drift: rand(0.15, 0.3), phase: rand(0, 6.28) }
}

useTitleAura({
  init(_rect, now) {
    seedBlades()
    const t = now / 1000
    seeds = [spawnSeed(t - 2), spawnSeed(t - 5)]
  },
  draw(ctx, { rect: r, t, reduced }) {
    const baseY = r.y + r.h + r.fs * 0.5
    const wind = Math.sin(t * 0.9) * 0.5 + Math.sin(t * 2.3) * 0.2
    for (const b of blades) {
      const x = r.x + r.w * b.x
      const hgt = r.fs * b.hgt
      const sway = (wind + Math.sin(t * 1.8 + b.phase) * 0.35) * r.fs * 0.22
      const tipX = x + b.lean * r.fs + sway
      const c = b.shade >= 0 ? lighten(palette.grass, b.shade) : palette.grass
      ctx.strokeStyle = withAlpha(c, 0.8)
      ctx.lineWidth = Math.max(0.8, r.fs * 0.07)
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(x, baseY)
      ctx.quadraticCurveTo(x + sway * 0.3, baseY - hgt * 0.6, tipX, baseY - hgt)
      ctx.stroke()
    }
    if (!reduced) {
      seeds = seeds.filter((s) => t - s.born < 7)
      if (seeds.length < 3 && Math.random() < 0.008) seeds.push(spawnSeed(t))
    }
    for (const s of seeds) {
      const u = (t - s.born) / 7
      if (u < 0 || u > 1) continue
      const x = r.x + r.w * (s.x + s.drift * u) + Math.sin(t * 1.4 + s.phase) * r.fs * 0.3
      const y = baseY - r.fs * 0.3 - u * (r.h + r.fs * 1.4)
      const a = Math.sin(u * Math.PI) * 0.85
      ctx.strokeStyle = withAlpha(palette.seed, a)
      ctx.lineWidth = Math.max(0.5, r.fs * 0.035)
      const s2 = r.fs * 0.14
      for (let k = 0; k < 5; k++) {
        const ang = (k / 5) * Math.PI - Math.PI / 2 + Math.sin(t + s.phase) * 0.2
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x + Math.cos(ang) * s2, y - Math.abs(Math.sin(ang)) * s2 - s2 * 0.4)
        ctx.stroke()
      }
      ctx.fillStyle = withAlpha(palette.seed, a)
      ctx.beginPath()
      ctx.arc(x, y, Math.max(0.6, r.fs * 0.045), 0, Math.PI * 2)
      ctx.fill()
    }
  },
})
</script>

<template>
  <canvas ref="canvas" aria-hidden="true" />
</template>
