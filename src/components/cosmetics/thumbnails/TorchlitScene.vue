<script setup lang="ts">
import { useElementCanvas } from '@/composables/useCanvasScene'
import type { TorchlitScene } from '@/types/cosmetics/background'
import { cyc, win, fillCircle } from '@/utils/cosmetics/canvasShapes'
import { drawFlame, glowDot, type FlameInk } from '@/utils/cosmetics/flame'
import { frameDelta, withAlpha } from '@/utils/cosmetics/overlayCanvas'
import { blitSceneLayer, paintSceneLayer } from '@/utils/cosmetics/sceneLayer'
import { sinHash01 } from '@/utils/random'
import { useTemplateRef } from 'vue'

const props = defineProps<{ scene: TorchlitScene }>()

const BRAZIER_X = [0.14, 0.32, 0.52, 0.7, 0.88]
const TRAIL_LIFE = 3600

interface Brazier {
  litAt: number
}

interface TrailPoint {
  x: number
  bornAt: number
  seed: number
}

interface Ember {
  x: number
  y: number
  vx: number
  vy: number
  life: number
}

interface Smoke {
  x: number
  y: number
  vx: number
  bornAt: number
  seed: number
}

let braziers: Brazier[] = []
let trail: TrailPoint[] = []
let embers: Ember[] = []
let smokes: Smoke[] = []
let lastTrail = 0
let lastEmber = 0
let lastSmoke = 0
let lastNow = 0
let backdrop: HTMLCanvasElement | null = null

function groundAt(x: number, h: number, s: number): number {
  return h * 0.8 + Math.sin((x * 0.018) / s) * h * 0.035
}

function paintBackdrop(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const { sky, ground, flameDeep } = props.scene
  const s = Math.min(w, h) / 140
  ctx.clearRect(0, 0, w, h)
  const bg = ctx.createLinearGradient(0, 0, 0, h)
  bg.addColorStop(0, sky)
  bg.addColorStop(1, withAlpha(ground, 0.35))
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, w, h)

  const horizon = ctx.createLinearGradient(0, h * 0.55, 0, h * 0.82)
  horizon.addColorStop(0, withAlpha(flameDeep, 0))
  horizon.addColorStop(1, withAlpha(flameDeep, props.scene.base === 'light' ? 0.14 : 0.1))
  ctx.fillStyle = horizon
  ctx.fillRect(0, h * 0.55, w, h * 0.27)

  ctx.fillStyle = withAlpha(ground, 0.55)
  ctx.beginPath()
  ctx.moveTo(0, h)
  for (let x = 0; x <= w; x += 8) ctx.lineTo(x, groundAt(x + 200 * s, h, s) - h * 0.06)
  ctx.lineTo(w, h)
  ctx.fill()

  ctx.fillStyle = ground
  ctx.beginPath()
  ctx.moveTo(0, h)
  for (let x = 0; x <= w; x += 8) ctx.lineTo(x, groundAt(x, h, s))
  ctx.lineTo(w, h)
  ctx.fill()
}

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')

useElementCanvas(canvasRef, {
  init() {
    braziers = BRAZIER_X.map(() => ({ litAt: -1e9 }))
    trail = []
    embers = []
    smokes = []
    lastTrail = 0
    lastEmber = 0
    lastSmoke = 0
    lastNow = 0
    backdrop = null
  },
  draw(ctx, w, h, now, reduced) {
    const t = reduced ? 5 : now / 1000
    const u = cyc(t, 12)
    const flare = reduced ? -1 : win(u, 0.95, 1)
    const fl = flare >= 0 ? Math.sin(flare * Math.PI) : 0
    const { ground, flameDeep, flame, ember } = props.scene
    const light = props.scene.base === 'light'
    const blend = light ? 'source-over' : 'lighter'
    const smokeColor = light ? 'rgba(60,70,80,1)' : 'rgba(200,190,180,1)'
    const s = Math.min(w, h) / 140
    const step = lastNow ? frameDelta(now, lastNow, reduced) * 60 : 0
    lastNow = now

    backdrop ??= paintSceneLayer(ctx, (layer) => paintBackdrop(layer, w, h))
    blitSceneLayer(ctx, backdrop)

    const groundY = (x: number) => groundAt(x, h, s)
    const ink: FlameInk = { deep: flameDeep, core: flame, blend }
    const glow = (x: number, y: number, r: number, color: string, a: number) => glowDot(ctx, x, y, r, color, a)
    const flameAt = (x: number, y: number, size: number, strength: number, seed: number) =>
      drawFlame(ctx, ink, t, x, y, size, strength, seed)

    const tx = w * u
    const ty = groundY(tx) - 14 * s + Math.sin(t * 6) * 1.4 * s

    if (!reduced && now - lastTrail > 90 && tx > 4) {
      lastTrail = now
      trail.push({ x: tx, bornAt: now, seed: sinHash01(now) * 40 })
      if (trail.length > 40) trail.shift()
    }
    if (reduced && trail.length === 0) {
      for (let k = 0; k < 8; k++) {
        trail.push({ x: tx - (k + 1) * 14 * s, bornAt: now - k * 350, seed: k * 9 })
      }
    }

    for (const tp of trail) {
      const age = (now - tp.bornAt) / TRAIL_LIFE
      if (age >= 1 || tp.x < 0) continue
      const decay = Math.min(1, (1 - age) * 1.4) * (0.8 + 0.2 * Math.sin(t * 13 + tp.seed))
      const gy = groundY(tp.x)
      flameAt(tp.x, gy, (3 + 4.5 * (1 - age)) * s, decay * 0.8, tp.seed)
      glow(tp.x, gy + 2 * s, 9 * s * (1 - age), flameDeep, 0.12 * decay)
    }

    for (let i = 0; i < BRAZIER_X.length; i++) {
      const bx = BRAZIER_X[i] * w
      const by = groundY(bx)
      if (!reduced && Math.abs(bx - tx) < 12 * s && now - braziers[i].litAt > 2000) {
        braziers[i].litAt = now
      }
      ctx.strokeStyle = withAlpha(ground, light ? 1 : 0.9)
      ctx.lineWidth = Math.max(1, 2 * s)
      ctx.beginPath()
      ctx.moveTo(bx, by)
      ctx.lineTo(bx, by - 9 * s)
      ctx.stroke()
      let lit = reduced ? 0.55 : Math.exp(-(now - braziers[i].litAt) / 5200)
      lit = Math.min(1, lit + fl * 0.8)
      if (lit < 0.04) {
        ctx.fillStyle = withAlpha(ember, 0.25)
        fillCircle(ctx, bx, by - 10 * s, Math.max(1, 1.4 * s))
        continue
      }
      flameAt(bx, by - 9 * s, 7 * s, lit, bx * 0.13)
      glow(bx, by + 2 * s, 15 * s * lit, flameDeep, 0.18 * lit)
    }

    glow(tx, groundY(tx) + 2 * s, 28 * s, flameDeep, 0.3 + fl * 0.15)
    ctx.strokeStyle = withAlpha(ground, light ? 1 : 0.9)
    ctx.lineWidth = Math.max(1, 2 * s)
    ctx.beginPath()
    ctx.moveTo(tx, groundY(tx))
    ctx.lineTo(tx, ty + 1.5 * s)
    ctx.stroke()
    flameAt(tx, ty, 9 * s, 1, 3.7)

    if (!reduced && now - lastEmber > 110 && embers.length < 22) {
      lastEmber = now
      embers.push({
        x: tx,
        y: ty - 6 * s,
        vx: (sinHash01(now) - 0.5) * 0.7 * s,
        vy: (-0.5 - sinHash01(now * 3) * 0.7) * s,
        life: 1,
      })
    }
    for (let i = embers.length - 1; i >= 0; i--) {
      const em = embers[i]
      em.x += em.vx * step
      em.y += em.vy * step
      em.life -= 0.018 * step
      if (em.life <= 0) {
        embers.splice(i, 1)
        continue
      }
      glow(em.x, em.y, 4 * s, ember, em.life * 0.7)
    }

    if (!reduced && now - lastSmoke > 520 && smokes.length < 5 && trail.length > 3) {
      lastSmoke = now
      const src = trail[Math.floor(sinHash01(now * 7) * trail.length)]
      smokes.push({
        x: src.x,
        y: groundY(src.x) - 6 * s,
        vx: (sinHash01(now * 11) - 0.2) * 0.25 * s,
        bornAt: now,
        seed: sinHash01(now * 5) * 20,
      })
    }
    for (let i = smokes.length - 1; i >= 0; i--) {
      const sm = smokes[i]
      const age = (now - sm.bornAt) / 3000
      if (age >= 1) {
        smokes.splice(i, 1)
        continue
      }
      const sx = sm.x + sm.vx * age * 100 + Math.sin(t * 1.6 + sm.seed) * 4 * s
      const sy = sm.y - age * 34 * s
      glow(sx, sy, (5 + age * 12) * s, smokeColor, (1 - age) * 0.12)
    }

    if (fl > 0) {
      ctx.fillStyle = withAlpha(flameDeep, fl * 0.16)
      ctx.fillRect(0, 0, w, h)
    }
  },
})
</script>

<template>
  <canvas ref="canvas" aria-hidden="true" />
</template>
