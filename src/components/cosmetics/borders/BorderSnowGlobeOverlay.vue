<script setup lang="ts">
import { useElementCanvas } from '@/composables/useCanvasScene'
import { useStackPointer } from '@/composables/useStackPointer'
import type { BorderOverlayHost, BorderSnowGlobeOverlaySpec, StarshineFill } from '@/types/cosmetics/border'
import type { Ctx } from '@/utils/cosmetics/canvasShapes'
import { enterUnitSpace, frameDelta, withAlpha } from '@/utils/cosmetics/overlayCanvas'
import {
  DOME,
  GLASS,
  groundY,
  inDome,
  keepInDome,
  TAU,
  type GlobeEnv,
  type GlobePoint,
  type GlobeScene,
} from '@/utils/cosmetics/snowGlobeKit'
import { createGlobeScene } from '@/utils/cosmetics/snowGlobeScenery'
import { drawTopper, drawWoodBase } from '@/utils/cosmetics/snowGlobeTopper'
import { clamp01 } from '@/utils/math'
import { randBetween as rand } from '@/utils/random'
import { computed, useTemplateRef, watch } from 'vue'

const props = defineProps<BorderOverlayHost & { overlay: BorderSnowGlobeOverlaySpec }>()

const MARGIN = 20
const SETTLED_DEPTH = 2
const REACT_AT = 0.45
const DRIZZLE_S = 0.3
const SHED_REGROW_S = 7
const FLAKE_FADE_S = 0.6

interface Flake {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  rest: boolean
  gold: boolean
  seed: number
  born: number
}

let flakes: Flake[] = []
let scene: GlobeScene = createGlobeScene(props.overlay.scene)
let clock = 0
let last = 0
let energy = 0
let swirl = 0
let lift = 0
let shed = 1
let nextShake = 0
let nextDrizzle = 0
let prev: GlobePoint | null = null

const starFill = computed<StarshineFill | null>(() => {
  const fill = props.color?.states?.[0]?.fill
  return props.overlay.star && fill?.type === 'starshine' ? fill : null
})

watch(() => props.overlay.scene, (kind) => {
  scene = createGlobeScene(kind)
})

function interval(): number {
  return rand(props.overlay.minIntervalMs ?? 16000, props.overlay.maxIntervalMs ?? 30000) / 1000
}

function surfaceY(x: number): number {
  return groundY(x) - SETTLED_DEPTH * (1 - lift)
}

function env(dt: number, pointer: GlobePoint | null): GlobeEnv {
  return { o: props.overlay, clock, dt, pointer, swirl, shed, surfaceY }
}

function drop(f: Flake, depth: number): void {
  f.x = DOME.x + rand(-30, 30)
  const top = DOME.y - Math.sqrt(DOME.r ** 2 - (f.x - DOME.x) ** 2) + 2
  f.y = top + (surfaceY(f.x) - top) * depth
  f.vx = 0
  f.vy = 3
  f.rest = false
  f.born = clock
}

function seedFlakes(): void {
  flakes = Array.from({ length: props.overlay.flakes ?? 70 }, (_, i) => {
    const f: Flake = { x: 0, y: 0, vx: 0, vy: 0, r: rand(0.5, 1.2), rest: i % 5 !== 0, gold: i % 4 === 0, seed: rand(0, TAU), born: 0 }
    if (!f.rest) drop(f, rand(0, 1))
    f.born = -FLAKE_FADE_S
    return f
  })
}

function launch(f: Flake, e: number, dx: number, dy: number): void {
  f.x = DOME.x + rand(-30, 30)
  f.y = surfaceY(f.x) - 0.5
  f.vx = dx * 30 * e + rand(-14, 14) * e
  f.vy = dy * 20 * e - rand(18, 52) * e
  f.rest = false
  f.born = clock
}

function shake(e: number, dx: number, dy: number): void {
  energy = Math.max(energy, e)
  swirl = (dx >= 0 ? 1 : -1) * e * 2.2
  nextShake = clock + interval()
  for (const f of flakes) {
    if (f.rest) {
      if (rand(0, 1) < e * 0.9) launch(f, e, dx, dy)
      continue
    }
    f.vx += (dx * 30 + rand(-10, 10)) * e * 0.25
    f.vy += (dy * 30 - rand(0, 14)) * e * 0.25
  }
  if (e <= REACT_AT) return
  shed = 0
  scene.shake(env(0, null))
}

function stepFlake(f: Flake, dt: number): void {
  const drift = Math.sin(clock * 0.7 + f.seed) * 2.2
  f.vx += (drift - f.vx) * Math.min(1, 1.4 * dt) - (f.y - DOME.y) * swirl * dt
  f.vy += (4 + f.r * 3.5 - f.vy) * Math.min(1, 1.1 * dt) + (f.x - DOME.x) * swirl * dt
  f.x += f.vx * dt
  f.y += f.vy * dt
  keepInDome(f, 1)
  const floor = surfaceY(f.x)
  if (f.y < floor || f.vy <= 0) return
  if (energy < 0.25) {
    f.rest = true
    return
  }
  f.y = floor
  f.vy = -f.vy * 0.3
}

function stepSnow(dt: number): void {
  energy = Math.max(0, energy - 0.9 * dt)
  swirl *= Math.exp(-1.1 * dt)
  shed = Math.min(1, shed + dt / SHED_REGROW_S)
  let airborne = 0
  for (const f of flakes) {
    if (f.rest) continue
    airborne++
    stepFlake(f, dt)
  }
  lift += (airborne / flakes.length - lift) * Math.min(1, 3 * dt)
  if (clock < nextDrizzle) return
  nextDrizzle = clock + DRIZZLE_S
  const settled = flakes.find((f) => f.rest)
  if (settled) drop(settled, 0)
}

function toUnits(p: GlobePoint | null): GlobePoint | null {
  return p ? { x: 50 + p.x * 100, y: 50 + p.y * 100 } : null
}

function readPointer(dt: number): GlobePoint | null {
  const p = toUnits(pointer.read())
  if (p && prev && dt > 0 && inDome(p)) {
    const dx = p.x - prev.x
    const dy = p.y - prev.y
    const dist = Math.hypot(dx, dy)
    const speed = dist / dt / 100
    if (speed > 0.8) shake(clamp01(speed * 0.22), dx / dist, dy / dist)
  }
  prev = p
  return p
}

function step(dt: number): void {
  const p = readPointer(dt)
  const press = toUnits(pointer.takePress())
  if (press && inDome(press)) scene.press(env(dt, p), press)
  if (clock >= nextShake) {
    const a = rand(0, TAU)
    shake(0.8, Math.cos(a), Math.sin(a))
  }
  stepSnow(dt)
  scene.step(env(dt, p))
}

function drawBank(ctx: Ctx, offset: number, color: string): void {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(0, 100)
  for (let x = 0; x <= 100; x += 4) ctx.lineTo(x, surfaceY(x) + offset)
  ctx.lineTo(100, 100)
  ctx.closePath()
  ctx.fill()
}

function drawFlakes(ctx: Ctx, gold: boolean, color: string): void {
  ctx.fillStyle = color
  ctx.beginPath()
  for (const f of flakes) {
    if (f.rest || f.gold !== gold || clock - f.born < FLAKE_FADE_S) continue
    ctx.moveTo(f.x + f.r, f.y)
    ctx.arc(f.x, f.y, f.r, 0, TAU)
  }
  ctx.fill()
  for (const f of flakes) {
    const age = (clock - f.born) / FLAKE_FADE_S
    if (f.rest || f.gold !== gold || age >= 1) continue
    ctx.globalAlpha = age
    ctx.beginPath()
    ctx.arc(f.x, f.y, f.r, 0, TAU)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

function drawInside(ctx: Ctx, gold: string): void {
  const o = props.overlay
  const view = env(0, null)
  ctx.save()
  ctx.clip(GLASS())
  scene.back(ctx, view)
  drawBank(ctx, 0, o.snow)
  drawBank(ctx, 4.5, o.shade)
  scene.front?.(ctx, view)
  drawFlakes(ctx, false, o.snow)
  drawFlakes(ctx, true, gold)
  ctx.restore()
}

function drawScene(ctx: Ctx, w: number, h: number): void {
  const o = props.overlay
  const starFillNow = starFill.value
  ctx.save()
  enterUnitSpace(ctx, w, h, MARGIN)
  drawInside(ctx, starFillNow?.light ?? o.snow)
  ctx.strokeStyle = withAlpha(o.glass, 0.22)
  ctx.lineWidth = 1.2
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.arc(DOME.x, DOME.y, DOME.r - 4, Math.PI * 1.1, Math.PI * 1.4)
  ctx.stroke()
  if (starFillNow && o.star) {
    drawWoodBase(ctx, o.star)
    drawTopper(ctx, starFillNow, clock)
  }
  ctx.restore()
}

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')
const pointer = useStackPointer(canvasRef, MARGIN, () => props.overlay.hover !== false)

useElementCanvas(canvasRef, {
  init(_w, _h, nowMs) {
    scene = createGlobeScene(props.overlay.scene)
    clock = 0
    last = nowMs
    energy = 0
    swirl = 0
    lift = 0.2
    shed = 1
    prev = null
    nextDrizzle = 0
    nextShake = interval() * rand(0.2, 0.4)
    seedFlakes()
  },
  resize() {},
  draw(ctx, w, h, now, reduced) {
    ctx.clearRect(0, 0, w, h)
    const dt = frameDelta(now, last, reduced)
    last = now
    clock += dt
    if (!reduced) step(dt)
    drawScene(ctx, w, h)
  },
})
</script>

<template>
  <canvas ref="canvas" aria-hidden="true" />
</template>
