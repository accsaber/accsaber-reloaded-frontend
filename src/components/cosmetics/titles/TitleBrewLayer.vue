<script setup lang="ts">
import TitleLayerHost from '@/components/cosmetics/titles/TitleLayerHost.vue'
import { useElementCanvas } from '@/composables/useCanvasScene'
import type { BrewIngredientKind, TitleBrewSpec } from '@/types/api/items'
import { darken, lerpHex, lighten } from '@/utils/color'
import { BREW_INGREDIENT_KINDS, boneShape, drawBubble, drawIngredient, skullShape } from '@/utils/cosmetics/brewScenery'
import type { Ctx } from '@/utils/cosmetics/canvasShapes'
import { withAlpha } from '@/utils/cosmetics/overlayCanvas'
import { pickVariant, titleAuraRect, type TitleAuraRect } from '@/utils/cosmetics/titleAura'
import { randBetween as rand } from '@/utils/random'
import { useTemplateRef } from 'vue'

const props = defineProps<{
  brew: TitleBrewSpec
  light: boolean
}>()

const emit = defineEmits<{
  liquid: [hex: string]
  splash: [xFrac: number]
}>()

interface Bubble {
  x: number
  y: number
  r: number
  vy: number
  pop: number
}

interface Bone {
  x: number
  speed: number
  size: number
  skull: boolean
  phase: number
}

interface Drop {
  kind: BrewIngredientKind
  color: string
  x: number
  y: number
  vy: number
  splash: number
}

interface Ring {
  x: number
  age: number
}

interface Wisp {
  x: number
  born: number
  life: number
  drift: number
}

const STATIC_T = 4
const TRANSITION_S = 1.6
const RING_LIFE_S = 1
const SINK_S = 0.9

let rect: TitleAuraRect | null = null
let bubbles: Bubble[] = []
let bones: Bone[] = []
let drops: Drop[] = []
let rings: Ring[] = []
let wisps: Wisp[] = []
let ingredientIdx = 0
let fromColor = ''
let toColor = ''
let blend = 1
let nextDropAt = 0
let clock = 0
let last = 0

function ingredientColor(i: number): string {
  const list = props.brew.ingredients
  const ing = list[((i % list.length) + list.length) % list.length]
  if (!ing) return '#4e7a2a'
  return pickVariant(props.light, ing.lightColor, ing.color)
}

function liquid(): string {
  return lerpHex(fromColor, toColor, blend)
}

function surfaceY(): number {
  return rect ? rect.y + rect.h * (props.brew.surface ?? 0.66) : 0
}

function bottomY(): number {
  return rect ? rect.y + rect.h + rect.fs * 0.3 : 0
}

function seed(): void {
  if (!rect) return
  const count = props.brew.bubbles ?? 9
  bubbles = Array.from({ length: count }, () => ({ x: rand(0, 1), y: rand(0, 1), r: rand(0.05, 0.12), vy: rand(0.08, 0.16), pop: 0 }))
  bones = Array.from({ length: 4 }, (_, i) => ({ x: rand(0, 1), speed: rand(0.02, 0.045) * (i % 2 ? -1 : 1), size: rand(0.16, 0.24), skull: i === 0, phase: rand(0, 6.28) }))
  drops = []
  rings = []
  wisps = []
  ingredientIdx = 0
  fromColor = ingredientColor(0)
  toColor = fromColor
  blend = 1
  nextDropAt = rand(1.5, 3)
}

function spawnDrop(): void {
  ingredientIdx += 1
  const list = props.brew.ingredients
  const ing = list[ingredientIdx % list.length]
  const kind = ing?.kind ?? BREW_INGREDIENT_KINDS[ingredientIdx % BREW_INGREDIENT_KINDS.length] ?? 'eye'
  drops.push({ kind, color: ingredientColor(ingredientIdx), x: rand(0.1, 0.9), y: -1.4, vy: 1.5, splash: -1 })
}

function land(d: Drop): void {
  d.splash = 0
  rings.push({ x: d.x, age: 0 })
  fromColor = liquid()
  toColor = d.color
  blend = 0
  emit('splash', d.x)
}

function stepDrops(dt: number): void {
  if (clock >= nextDropAt) {
    spawnDrop()
    nextDropAt = clock + rand(props.brew.dropMinS ?? 4, props.brew.dropMaxS ?? 9)
  }
  for (const d of drops) {
    if (d.splash >= 0) {
      d.splash += dt
      continue
    }
    d.vy += 4.2 * dt
    d.y += d.vy * dt
    if (d.y >= 0) land(d)
  }
  drops = drops.filter((d) => d.splash < SINK_S)
  for (const r of rings) r.age += dt
  rings = rings.filter((r) => r.age < RING_LIFE_S)
  if (blend < 1) {
    blend = Math.min(1, blend + dt / TRANSITION_S)
    emit('liquid', liquid())
  }
}

function stepBubbles(dt: number): void {
  for (const b of bubbles) {
    if (b.pop > 0) {
      b.pop += dt
      if (b.pop > 0.3) Object.assign(b, { x: rand(0, 1), y: 1, r: rand(0.05, 0.12), pop: 0 })
      continue
    }
    b.y -= b.vy * dt
    b.x += Math.sin(clock * 2 + b.y * 6) * 0.03 * dt
    if (b.y <= 0.02) b.pop = 0.01
  }
}

function stepWisps(dt: number): void {
  wisps = wisps.filter((wp) => clock - wp.born < wp.life)
  if (wisps.length < 3 && Math.random() < dt * 0.6) {
    wisps.push({ x: rand(0.1, 0.9), born: clock, life: rand(2.2, 3.4), drift: rand(-0.08, 0.08) })
  }
}

function step(dt: number): void {
  clock += dt
  stepDrops(dt)
  stepBubbles(dt)
  stepWisps(dt)
  for (const bn of bones) bn.x = ((bn.x + bn.speed * dt) % 1 + 1) % 1
}

function surfaceAt(u: number, t: number): number {
  if (!rect) return 0
  return surfaceY() + (Math.sin(u * 9 + t * 1.7) * 0.5 + Math.sin(u * 15 - t * 2.3) * 0.3) * rect.fs * 0.045
}

function liquidPath(ctx: Ctx, t: number): void {
  if (!rect) return
  const x0 = rect.x - rect.fs * 0.45
  const x1 = rect.x + rect.w + rect.fs * 0.45
  const yb = bottomY()
  ctx.beginPath()
  ctx.moveTo(x0, surfaceAt(0, t))
  for (let i = 1; i <= 24; i++) {
    const u = i / 24
    ctx.lineTo(x0 + (x1 - x0) * u, surfaceAt(u, t))
  }
  ctx.bezierCurveTo(x1, yb + rect.fs * 0.25, x0, yb + rect.fs * 0.25, x0, surfaceAt(0, t))
  ctx.closePath()
}

function drawLiquid(ctx: Ctx, t: number, color: string): void {
  if (!rect) return
  liquidPath(ctx, t)
  const g = ctx.createLinearGradient(0, surfaceY(), 0, bottomY())
  g.addColorStop(0, darken(color, 0.2))
  g.addColorStop(1, darken(color, 0.65))
  ctx.fillStyle = g
  ctx.fill()
  ctx.save()
  liquidPath(ctx, t)
  ctx.clip()
  ctx.strokeStyle = withAlpha(lighten(color, 0.35), 0.3)
  ctx.lineWidth = Math.max(0.6, rect.fs * 0.05)
  for (let arm = 0; arm < 3; arm++) {
    ctx.beginPath()
    for (let i = 0; i <= 30; i++) {
      const u = i / 30
      const x = rect.x + rect.w * ((u + arm / 3 + t * 0.05) % 1)
      const y = surfaceY() + (bottomY() - surfaceY()) * (0.3 + 0.45 * (0.5 + 0.5 * Math.sin(u * 12 + arm * 2 + t * 0.9)))
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
  }
  ctx.restore()
  ctx.strokeStyle = withAlpha(lighten(color, 0.45), 0.5)
  ctx.lineWidth = Math.max(0.8, rect.fs * 0.05)
  ctx.beginPath()
  const x0 = rect.x - rect.fs * 0.45
  const x1 = rect.x + rect.w + rect.fs * 0.45
  for (let i = 0; i <= 24; i++) {
    const u = i / 24
    const x = x0 + (x1 - x0) * u
    if (i === 0) ctx.moveTo(x, surfaceAt(u, t))
    else ctx.lineTo(x, surfaceAt(u, t))
  }
  ctx.stroke()
}

function drawBones(ctx: Ctx, t: number, color: string): void {
  if (!rect) return
  for (const bn of bones) {
    const x = rect.x + rect.w * bn.x
    const bob = Math.sin(t * 1.6 + bn.phase) * rect.fs * 0.03
    const y = surfaceAt(bn.x, t) + rect.fs * 0.06 + bob
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(Math.sin(t * 0.8 + bn.phase) * 0.25)
    ctx.fillStyle = props.brew.bone ?? '#e9e3d0'
    const size = bn.size * rect.fs
    if (bn.skull) skullShape(ctx, size, color)
    else boneShape(ctx, size)
    ctx.fillStyle = withAlpha(color, 0.6)
    ctx.fillRect(-size * 1.4, size * 0.05 + bob * 0.5, size * 2.8, size * 1.6)
    ctx.restore()
  }
}

function drawBubbles(ctx: Ctx, color: string): void {
  if (!rect) return
  const depth = bottomY() - surfaceY()
  for (const b of bubbles) {
    const x = rect.x + rect.w * b.x
    const y = surfaceY() + depth * b.y
    drawBubble(ctx, x, y, b.r * rect.fs, b.pop, rect.fs * 0.04, color)
  }
}

function drawDrops(ctx: Ctx, t: number, color: string): void {
  if (!rect) return
  for (const r of rings) {
    const u = r.age / RING_LIFE_S
    ctx.strokeStyle = withAlpha(lighten(color, 0.5), 0.7 * (1 - u))
    ctx.lineWidth = Math.max(0.6, rect.fs * (0.08 - u * 0.06))
    ctx.beginPath()
    ctx.ellipse(rect.x + rect.w * r.x, surfaceAt(r.x, t), rect.fs * (0.1 + u * 0.9), rect.fs * (0.04 + u * 0.3), 0, 0, Math.PI * 2)
    ctx.stroke()
    ctx.fillStyle = withAlpha(lighten(color, 0.4), 0.8 * (1 - u))
    for (let k = -1; k <= 1; k++) {
      ctx.beginPath()
      ctx.arc(rect.x + rect.w * r.x + k * rect.fs * (0.15 + u * 0.35), surfaceAt(r.x, t) - rect.fs * (u * 0.9 - u * u * 0.9 + 0.05), rect.fs * 0.035 * (1 - u), 0, Math.PI * 2)
      ctx.fill()
    }
  }
  for (const d of drops) {
    const sink = d.splash >= 0 ? d.splash / SINK_S : 0
    ctx.save()
    ctx.translate(rect.x + rect.w * d.x, surfaceAt(d.x, t) + d.y * rect.fs + sink * rect.fs * 0.35)
    ctx.globalAlpha = 1 - sink
    ctx.rotate(sink * 1.2 + (d.splash < 0 ? d.y * 0.4 : 0))
    drawIngredient(ctx, d.kind, rect.fs * 0.17)
    ctx.restore()
  }
}

function drawWisps(ctx: Ctx, t: number, color: string): void {
  if (!rect) return
  for (const wp of wisps) {
    const u = (t - wp.born) / wp.life
    const x = rect.x + rect.w * (wp.x + wp.drift * u) + Math.sin(u * 7 + wp.born) * rect.fs * 0.08
    const y = surfaceY() - u * rect.fs * 1.5
    for (let k = 0; k < 3; k++) {
      const uu = Math.min(1, u + k * 0.09)
      ctx.fillStyle = withAlpha(lighten(color, 0.6), 0.1 * Math.sin(uu * Math.PI) * (1 - k * 0.25))
      ctx.beginPath()
      ctx.ellipse(x + Math.sin(uu * 9 + wp.born) * rect.fs * 0.06, y - k * rect.fs * 0.12, rect.fs * (0.05 + uu * 0.09), rect.fs * (0.07 + uu * 0.1), 0, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

function drawScene(ctx: Ctx, t: number): void {
  const color = liquid()
  drawWisps(ctx, t, color)
  drawLiquid(ctx, t, color)
  drawBubbles(ctx, color)
  drawBones(ctx, t, color)
  drawDrops(ctx, t, color)
}

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')

useElementCanvas(canvasRef, {
  init(_w, _h, now) {
    rect = canvasRef.value ? titleAuraRect(canvasRef.value) : null
    last = now
    clock = 0
    seed()
    emit('liquid', liquid())
  },
  draw(ctx, w, h, now, reduced) {
    ctx.clearRect(0, 0, w, h)
    if (!rect) return
    if (reduced) {
      drawScene(ctx, STATIC_T)
      return
    }
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now
    step(dt)
    drawScene(ctx, clock)
  },
})
</script>

<template>
  <TitleLayerHost>
    <canvas ref="canvas" />
  </TitleLayerHost>
</template>
