<script setup lang="ts">
import { useElementCanvas } from '@/composables/useCanvasScene'
import type { TitleGhostsAuraSpec } from '@/types/api/items'
import { withAlpha } from '@/utils/cosmetics/overlayCanvas'
import { pickVariant, titleAuraRect, type TitleAuraRect } from '@/utils/cosmetics/titleAura'
import { randBetween as rand } from '@/utils/random'
import { useTemplateRef } from 'vue'

const props = defineProps<{
  aura: TitleGhostsAuraSpec
  light: boolean
}>()

interface Ghost {
  born: number
  life: number
  x: number
  size: number
  phase: number
  sway: number
  drift: number
}

const STATIC_T = 2

let rect: TitleAuraRect | null = null
let ghosts: Ghost[] = []

function sheet(): string {
  return pickVariant(props.light, props.aura.lightColor, props.aura.color, '#e9e3d0')
}

function glow(): string {
  return pickVariant(props.light, props.aura.lightGlow, props.aura.glow, '#8c7bb8')
}

function spawn(now: number, first: boolean): Ghost {
  return {
    born: first ? now - rand(0, 6) : now + rand(0.2, 1.6),
    life: rand(5, 8),
    x: rand(0.05, 0.95),
    size: rand(0.45, 0.72),
    phase: rand(0, 6.28),
    sway: rand(0.25, 0.45),
    drift: rand(-0.15, 0.15),
  }
}

function ghostPath(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, t: number): void {
  const w = s * 0.72
  const hem = s * 0.55
  ctx.beginPath()
  ctx.arc(x, y, w / 2, Math.PI, 0)
  ctx.lineTo(x + w / 2, y + hem)
  for (let i = 0; i < 3; i++) {
    const x0 = x + w / 2 - (i * w) / 3
    const x1 = x0 - w / 3
    const dip = s * (0.1 + 0.05 * Math.sin(t * 6 + i * 2 + x))
    ctx.quadraticCurveTo((x0 + x1) / 2, y + hem + dip, x1, y + hem)
  }
  ctx.closePath()
}

function drawGhost(ctx: CanvasRenderingContext2D, g: Ghost, t: number, r: TitleAuraRect): void {
  const u = (t - g.born) / g.life
  if (u < 0 || u > 1) return
  const s = r.fs * g.size
  const x = r.x + r.w * (g.x + g.drift * u) + Math.sin(t * 1.3 + g.phase) * r.fs * g.sway
  const y = r.y + r.h + r.fs * 0.4 - u * (r.h + r.fs * 1.5)
  const a = Math.min(0.6, Math.sin(u * Math.PI) * 0.9)
  ctx.globalCompositeOperation = props.light ? 'source-over' : 'lighter'
  const halo = ctx.createRadialGradient(x, y + s * 0.2, 0, x, y + s * 0.2, s * 1.3)
  halo.addColorStop(0, withAlpha(glow(), 0.35 * a))
  halo.addColorStop(1, withAlpha(glow(), 0))
  ctx.fillStyle = halo
  ctx.fillRect(x - s * 1.3, y - s * 1.1, s * 2.6, s * 2.6)
  ctx.globalCompositeOperation = 'source-over'
  ctx.fillStyle = withAlpha(sheet(), a)
  ghostPath(ctx, x, y, s, t)
  ctx.fill()
  ctx.globalCompositeOperation = 'destination-out'
  ctx.fillStyle = 'rgba(0,0,0,1)'
  for (const ex of [-0.13, 0.13]) {
    ctx.beginPath()
    ctx.ellipse(x + ex * s, y - s * 0.02, s * 0.06, s * 0.09, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalCompositeOperation = 'source-over'
}

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')

useElementCanvas(canvasRef, {
  init(_w, _h, now) {
    rect = canvasRef.value ? titleAuraRect(canvasRef.value) : null
    const t = now / 1000
    ghosts = Array.from({ length: props.aura.count ?? 4 }, () => spawn(t, true))
  },
  draw(ctx, w, h, now, reduced) {
    ctx.clearRect(0, 0, w, h)
    if (!rect) return
    const t = reduced ? STATIC_T : now / 1000
    ghosts = ghosts.map((g) => (t - g.born > g.life ? spawn(t, false) : g))
    for (const g of ghosts) drawGhost(ctx, g, t, rect)
  },
})
</script>

<template>
  <canvas ref="canvas" aria-hidden="true" />
</template>
