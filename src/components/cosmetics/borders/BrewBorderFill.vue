<script setup lang="ts">
import { useElementCanvas } from '@/composables/useCanvasScene'
import type { BrewFill, BrewIngredientKind } from '@/types/api/items'
import { BREW_INGREDIENT_KINDS, boneShape, drawBubble, drawIngredient, skullShape } from '@/utils/cosmetics/brewScenery'
import { darken, lerpHex, lighten } from '@/utils/color'
import { frameDelta, overlaySpace, withAlpha } from '@/utils/cosmetics/overlayCanvas'
import { randBetween as rand } from '@/utils/random'
import { useTemplateRef } from 'vue'
import type { Ctx } from '@/utils/cosmetics/canvasShapes'

const props = defineProps<{
  fill: BrewFill
}>()

interface Bubble {
  x: number
  y: number
  r: number
  vy: number
  pop: number
}

interface Bone {
  angle: number
  radius: number
  speed: number
  size: number
  skull: boolean
  phase: number
}

interface Drop {
  kind: BrewIngredientKind
  x: number
  y: number
  vy: number
  splash: number
  land: number
}

const MARGIN = 25
const TRANSITION_S = 1.6

let bubbles: Bubble[] = []
let bones: Bone[] = []
let drops: Drop[] = []
let rings: { x: number; y: number; age: number }[] = []
let colorIdx = 0
let blend = 1
let nextDropAt = 0
let clock = 0
let last = 0

function palette(): string[] {
  return props.fill.colors.length ? props.fill.colors : ['#4e7a2a']
}

function liquid(): string {
  const cs = palette()
  const from = cs[(colorIdx + cs.length - 1) % cs.length] ?? '#4e7a2a'
  const to = cs[colorIdx % cs.length] ?? '#4e7a2a'
  return lerpHex(from, to, blend)
}

function seed(): void {
  bubbles = Array.from({ length: props.fill.bubbles ?? 20 }, () => ({ x: rand(-20, 120), y: rand(-20, 120), r: rand(0.8, 2.4), vy: rand(4, 9), pop: 0 }))
  bones = Array.from({ length: 7 }, (_, i) => ({ angle: rand(0, 6.28), radius: rand(46, 66), speed: rand(0.12, 0.22) * (i % 2 ? 1 : -1), size: rand(5, 8), skull: i === 0, phase: rand(0, 6.28) }))
  drops = []
  rings = []
  colorIdx = 0
  blend = 1
  nextDropAt = rand(2, 5)
}

function landing(): { x: number; y: number } {
  const side = Math.floor(rand(0, 4))
  if (side === 0) return { x: rand(-14, 114), y: rand(-12, 8) }
  if (side === 1) return { x: rand(-14, 114), y: rand(92, 112) }
  if (side === 2) return { x: rand(-14, 8), y: rand(10, 90) }
  return { x: rand(92, 114), y: rand(10, 90) }
}

function spawnDrop(): void {
  const at = landing()
  drops.push({ kind: BREW_INGREDIENT_KINDS[Math.floor(Math.random() * BREW_INGREDIENT_KINDS.length)] ?? 'eye', x: at.x, y: at.y - 60, vy: 90, splash: -1, land: at.y })
}

function step(dt: number): void {
  clock += dt
  if (clock >= nextDropAt) {
    spawnDrop()
    nextDropAt = clock + rand(props.fill.dropMinS ?? 5, props.fill.dropMaxS ?? 11)
  }
  for (const d of drops) {
    if (d.splash >= 0) {
      d.splash += dt
      continue
    }
    d.vy += 160 * dt
    d.y += d.vy * dt
    if (d.y >= d.land) {
      d.splash = 0
      rings.push({ x: d.x, y: d.y, age: 0 })
      colorIdx = (colorIdx + 1) % palette().length
      blend = 0
    }
  }
  drops = drops.filter((d) => d.splash < 0.9)
  for (const r of rings) r.age += dt
  rings = rings.filter((r) => r.age < 1.2)
  blend = Math.min(1, blend + dt / TRANSITION_S)
  for (const b of bubbles) {
    if (b.pop > 0) {
      b.pop += dt
      if (b.pop > 0.3) Object.assign(b, { x: rand(-20, 120), y: 125, r: rand(0.8, 2.4), pop: 0 })
      continue
    }
    b.y -= b.vy * dt
    b.x += Math.sin(clock * 2 + b.y * 0.2) * 3 * dt
    if (b.y < rand(-25, 30) && Math.random() < 0.02) b.pop = 0.01
    if (b.y < -25) b.y = 125
  }
  for (const bn of bones) bn.angle += bn.speed * dt
}

function drawSwirl(ctx: Ctx, w: number, h: number, sx: number, t: number, color: string): void {
  const cx = w * 0.5
  const cy = h * 0.5
  ctx.strokeStyle = withAlpha(lighten(color, 0.35), 0.16)
  ctx.lineWidth = Math.max(1, 1.4 * sx)
  for (let arm = 0; arm < 3; arm++) {
    ctx.beginPath()
    for (let i = 0; i <= 60; i++) {
      const u = i / 60
      const a = u * Math.PI * 3.2 + arm * 2.09 + t * 0.35
      const r = (4 + u * 70) * sx
      const x = cx + Math.cos(a) * r
      const y = cy + Math.sin(a) * r
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
  }
  ctx.strokeStyle = withAlpha(darken(color, 0.4), 0.2)
  for (let arm = 0; arm < 3; arm++) {
    ctx.beginPath()
    for (let i = 0; i <= 60; i++) {
      const u = i / 60
      const a = u * Math.PI * 3.2 + arm * 2.09 + 1 + t * 0.35
      const r = (8 + u * 70) * sx
      const x = cx + Math.cos(a) * r
      const y = cy + Math.sin(a) * r
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
  }
}

function drawBones(ctx: Ctx, w: number, h: number, sx: number, sy: number, t: number, color: string): void {
  const cx = w * 0.5
  const cy = h * 0.5
  for (const bn of bones) {
    const x = cx + Math.cos(bn.angle) * bn.radius * sx
    const y = cy + Math.sin(bn.angle) * bn.radius * sy
    const bob = Math.sin(t * 1.6 + bn.phase) * 0.6
    ctx.save()
    ctx.translate(x, y + bob * sy)
    ctx.rotate(bn.angle + Math.PI * 0.5 + Math.sin(t + bn.phase) * 0.2)
    ctx.fillStyle = props.fill.bone
    if (bn.skull) skullShape(ctx, bn.size * sx, color)
    else boneShape(ctx, bn.size * sx)
    ctx.fillStyle = withAlpha(color, 0.55)
    ctx.fillRect(-bn.size * 1.3 * sx, bn.size * sx * (0.1 + bob * 0.2), bn.size * 2.6 * sx, bn.size * 2 * sx)
    ctx.restore()
  }
}

function drawBubbles(ctx: Ctx, toX: (u: number) => number, toY: (u: number) => number, sx: number, color: string): void {
  for (const b of bubbles) drawBubble(ctx, toX(b.x), toY(b.y), b.r * sx, b.pop, 0.6 * sx, color)
}

function drawDrops(ctx: Ctx, toX: (u: number) => number, toY: (u: number) => number, sx: number, color: string): void {
  for (const r of rings) {
    const u = r.age / 1.2
    ctx.strokeStyle = withAlpha(lighten(color, 0.5), 0.7 * (1 - u))
    ctx.lineWidth = Math.max(0.8, (2 - u * 1.5) * sx)
    ctx.beginPath()
    ctx.ellipse(toX(r.x), toY(r.y), (3 + u * 26) * sx, (1.5 + u * 12) * sx, 0, 0, Math.PI * 2)
    ctx.stroke()
  }
  for (const d of drops) {
    const sink = d.splash >= 0 ? d.splash / 0.9 : 0
    ctx.save()
    ctx.translate(toX(d.x), toY(d.y) + sink * 6 * sx)
    ctx.globalAlpha = 1 - sink
    ctx.rotate(sink * 1.2)
    drawIngredient(ctx, d.kind, 3.2 * sx)
    ctx.restore()
  }
}

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')

useElementCanvas(canvasRef, {
  init(_w, _h, now) {
    last = now
    clock = 0
    seed()
  },
  draw(ctx, w, h, now, reduced) {
    const dt = frameDelta(now, last, reduced)
    last = now
    if (!reduced) step(dt)
    const t = reduced ? 3 : clock
    const { sx, sy, toX, toY } = overlaySpace(w, h, MARGIN)
    const color = liquid()
    ctx.fillStyle = color
    ctx.fillRect(0, 0, w, h)
    const vignette = ctx.createRadialGradient(w * 0.5, h * 0.5, Math.min(w, h) * 0.2, w * 0.5, h * 0.5, Math.max(w, h) * 0.75)
    vignette.addColorStop(0, withAlpha(darken(color, 0.5), 0))
    vignette.addColorStop(1, withAlpha(darken(color, 0.5), 0.5))
    ctx.fillStyle = vignette
    ctx.fillRect(0, 0, w, h)
    drawSwirl(ctx, w, h, sx, t, color)
    drawBones(ctx, w, h, sx, sy, t, color)
    drawBubbles(ctx, toX, toY, sx, color)
    drawDrops(ctx, toX, toY, sx, color)
  },
})
</script>

<template>
  <canvas ref="canvas" class="brew-border-fill" aria-hidden="true" />
</template>

<style scoped>
.brew-border-fill {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  max-width: none;
  max-height: none;
  pointer-events: none;
}
</style>
