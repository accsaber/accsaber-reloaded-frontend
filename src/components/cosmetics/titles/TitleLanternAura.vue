<script setup lang="ts">
import { pigments, useTitleAura } from '@/composables/useTitleAura'
import type { TitleLanternAuraSpec, TitleLanternSpec } from '@/types/cosmetics/title'
import { lanternLevel } from '@/utils/cosmetics/lanternFlicker'
import { withAlpha } from '@/utils/cosmetics/overlayCanvas'
import { drawTitleHalo, type TitleAuraRect } from '@/utils/cosmetics/titleAura'
import { randBetween as rand } from '@/utils/random'

const props = defineProps<{
  aura: TitleLanternAuraSpec
  light: boolean
  lantern?: TitleLanternSpec
}>()

interface Ember {
  x: number
  y: number
  speed: number
  phase: number
}

const palette = pigments(props.aura, props.light, { glow: '#e8781e', core: '#ffe08a' })

let embers: Ember[] = []

function drawEmbers(ctx: CanvasRenderingContext2D, r: TitleAuraRect, t: number, level: number): void {
  for (const e of embers) {
    const u = ((e.y - t * e.speed) % 1.2 + 1.2) % 1.2
    const x = r.x + r.w * (e.x + Math.sin(t * 1.1 + e.phase) * 0.03)
    const y = r.y + r.h + r.fs * 0.3 - u * (r.h + r.fs * 1.6)
    const a = (0.25 + 0.4 * (0.5 + 0.5 * Math.sin(t * 3 + e.phase))) * level * (1 - u / 1.2)
    ctx.fillStyle = withAlpha(palette.core, a)
    ctx.beginPath()
    ctx.arc(x, y, r.fs * 0.045, 0, Math.PI * 2)
    ctx.fill()
  }
}

useTitleAura({
  staticT: 2,
  additive: () => !props.light,
  init() {
    embers = Array.from({ length: props.aura.embers ?? 7 }, () => ({ x: rand(0.1, 0.9), y: rand(0, 1.2), speed: rand(0.08, 0.16), phase: rand(0, 6.28) }))
  },
  draw(ctx, { rect, t, reduced }) {
    const level = reduced ? 0.85 : lanternLevel(t, 0, props.lantern)
    drawTitleHalo(ctx, rect, palette.core, palette.glow, level)
    if (!reduced) drawEmbers(ctx, rect, t, level)
  },
})
</script>

<template>
  <canvas ref="canvas" aria-hidden="true" />
</template>
