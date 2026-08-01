<script setup lang="ts">
import { useElementCanvas } from '@/composables/useBackdropCanvas'
import type { StolenFlameFill } from '@/types/api/items'
import { luminance } from '@/utils/color'
import { overlaySpace, withAlpha } from '@/utils/overlayCanvas'
import { useTemplateRef } from 'vue'

const MARGIN = 25

const props = defineProps<{
  fill: StolenFlameFill
}>()

function hash(i: number): number {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.545
  return x - Math.floor(x)
}

interface Brazier {
  x: number
  y: number
  litAt: number
}

interface TrailPoint {
  x: number
  y: number
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
let bx = -1
let by = -1
let dirX = 0.8
let dirY = 0.6
let lastNow = 0
let lastBounceX = -1e9
let lastBounceY = -1e9
let bounceAt = -1e9
let flareAt = -1e9

const TRAIL_LIFE = 4000
const CORNER_MS = 300
const SPARK_COUNT = 16

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')

useElementCanvas(canvasRef, {
  init() {
    braziers = Array.from({ length: 12 }, (_, i) => ({
      x: 0.06 + hash(i * 3 + 1) * 0.88,
      y: 0.06 + hash(i * 7 + 2) * 0.88,
      litAt: -1e9,
    }))
    trail = []
    embers = []
    smokes = []
    lastTrail = 0
    lastEmber = 0
    lastSmoke = 0
    bx = -1
    by = -1
    lastNow = 0
    lastBounceX = -1e9
    lastBounceY = -1e9
    bounceAt = -1e9
    flareAt = -1e9
  },
  draw(ctx, w, h, now, reduced) {
    const t = reduced ? 2.5 : now / 1000
    const dark = luminance(props.fill.night) < 0.5
    const blend = dark ? 'lighter' : 'source-over'
    const smokeColor = dark ? 'rgba(200,190,180,1)' : 'rgba(60,70,80,1)'
    const { toX, toY } = overlaySpace(w, h, MARGIN)
    const stackX0 = toX(0)
    const stackX1 = toX(100)
    const stackY0 = toY(0)
    const stackY1 = toY(100)
    const stackW = stackX1 - stackX0
    const stackH = stackY1 - stackY0
    const cell = Math.max(18, Math.min(stackW, stackH) / 4.5)

    if (bx < 0) {
      bx = stackX0 + stackW * 0.3
      by = stackY0 + stackH * 0.4
      const ang = hash(7) * Math.PI * 2
      dirX = Math.cos(ang)
      dirY = Math.sin(ang)
      if (Math.abs(dirX) < 0.35) dirX = dirX < 0 ? -0.35 : 0.35
      if (Math.abs(dirY) < 0.35) dirY = dirY < 0 ? -0.35 : 0.35
      const len = Math.hypot(dirX, dirY)
      dirX /= len
      dirY /= len
      lastNow = now
    }

    const dt = reduced ? 0 : Math.min(0.05, (now - lastNow) / 1000)
    lastNow = now
    const speed = Math.max(stackW, stackH) * 0.24
    const mx = stackW * 0.03
    const myTop = stackH * 0.05
    const myBot = stackH * 0.03
    bx += dirX * speed * dt
    by += dirY * speed * dt
    let bounced = false
    if (bx < stackX0 + mx) { bx = stackX0 + mx; dirX = Math.abs(dirX); lastBounceX = now; bounced = true }
    else if (bx > stackX1 - mx) { bx = stackX1 - mx; dirX = -Math.abs(dirX); lastBounceX = now; bounced = true }
    if (by < stackY0 + myTop) { by = stackY0 + myTop; dirY = Math.abs(dirY); lastBounceY = now; bounced = true }
    else if (by > stackY1 - myBot) { by = stackY1 - myBot; dirY = -Math.abs(dirY); lastBounceY = now; bounced = true }
    if (bounced) {
      bounceAt = now
      for (let k = 0; k < 6 && embers.length < 34; k++) {
        embers.push({
          x: bx,
          y: by,
          vx: (hash(now + k) - 0.5) * 2.4,
          vy: (hash(now * 3 + k) - 0.5) * 2.4 - 0.6,
          life: 1,
        })
      }
      if (Math.abs(lastBounceX - lastBounceY) < CORNER_MS && flareAt < Math.min(lastBounceX, lastBounceY)) {
        flareAt = now
      }
    }
    const fl = reduced ? 0 : Math.exp(-(now - flareAt) / 550)
    const bump = reduced ? 0 : Math.exp(-(now - bounceAt) / 200)

    ctx.clearRect(0, 0, w, h)
    ctx.fillStyle = props.fill.night
    ctx.fillRect(0, 0, w, h)
    const under = ctx.createRadialGradient(
      w / 2, h * 0.75, 0,
      w / 2, h * 0.75, Math.max(stackW, stackH) * 0.8,
    )
    under.addColorStop(0, withAlpha(props.fill.flameDeep, dark ? 0.07 : 0.1))
    under.addColorStop(1, withAlpha(props.fill.flameDeep, 0))
    ctx.fillStyle = under
    ctx.fillRect(0, 0, w, h)

    const glow = (x: number, y: number, r: number, color: string, a: number) => {
      const pr = Math.max(2, r)
      const g = ctx.createRadialGradient(x, y, 0, x, y, pr)
      g.addColorStop(0, color)
      g.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.globalAlpha = Math.max(0, Math.min(1, a))
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(x, y, pr, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
    }

    const drawFlame = (x: number, y: number, size: number, strength: number, seed: number, lean = 0) => {
      if (strength < 0.04 || size < 1) return
      const tip = size * (1.7 + 0.35 * Math.sin(t * 9 + seed) + 0.15 * Math.sin(t * 23 + seed * 2))
      const sway = size * 0.3 * Math.sin(t * 7 + seed) + lean * tip * 0.45
      const w0 = Math.max(0.8, size * 0.55) * (0.7 + 0.3 * strength)
      ctx.globalCompositeOperation = blend
      glow(x, y - tip * 0.35, size * 2.1, props.fill.flameDeep, 0.4 * strength)
      ctx.fillStyle = withAlpha(props.fill.flameDeep, 0.85 * strength)
      ctx.beginPath()
      ctx.moveTo(x - w0, y)
      ctx.quadraticCurveTo(x - w0 * 0.95, y - tip * 0.45, x + sway, y - tip)
      ctx.quadraticCurveTo(x + w0 * 0.95, y - tip * 0.45, x + w0, y)
      ctx.quadraticCurveTo(x, y + w0 * 0.55, x - w0, y)
      ctx.fill()
      const tip2 = tip * 0.55
      const w2 = w0 * 0.5
      ctx.fillStyle = withAlpha(props.fill.flame, 0.95 * strength)
      ctx.beginPath()
      ctx.moveTo(x - w2, y)
      ctx.quadraticCurveTo(x - w2 * 0.85, y - tip2 * 0.5, x + sway * 0.6, y - tip2)
      ctx.quadraticCurveTo(x + w2 * 0.85, y - tip2 * 0.5, x + w2, y)
      ctx.quadraticCurveTo(x, y + w2 * 0.55, x - w2, y)
      ctx.fill()
      ctx.globalCompositeOperation = 'source-over'
    }

    if (!reduced && now - lastTrail > 45) {
      lastTrail = now
      trail.push({ x: bx, y: by, bornAt: now, seed: hash(now) * 40 })
      if (trail.length > 70) trail.shift()
    }
    if (reduced && trail.length === 0) {
      for (let k = 0; k < 14; k++) {
        trail.push({
          x: bx - dirX * k * cell * 0.5,
          y: by - dirY * k * cell * 0.5,
          bornAt: now - k * 220,
          seed: k * 9,
        })
      }
    }

    for (let sp = 0; sp < SPARK_COUNT; sp++) {
      const sx = toX((hash(sp + 90) * 100 + t * (2 + hash(sp + 30) * 3)) % 100)
      const sy = toY((hash(sp + 55) * 100 - t * (1.4 + hash(sp + 70) * 2) % 100 + 100) % 100)
      const flick = 0.25 + 0.45 * Math.max(0, Math.sin(t * (1.6 + hash(sp) * 1.8) + sp * 2.3))
      glow(sx, sy, cell * 0.09, props.fill.ember, flick)
    }

    for (const b of braziers) {
      const px = toX(b.x * 100)
      const py = toY(b.y * 100)
      if (!reduced && Math.hypot(px - bx, py - by) < cell * 0.9 && now - b.litAt > 1500) {
        b.litAt = now
      }
      let lit = reduced ? 0.5 : Math.exp(-(now - b.litAt) / 6500)
      lit = Math.min(1, lit + fl * 0.8)
      if (lit < 0.04) {
        ctx.fillStyle = withAlpha(props.fill.ember, 0.18)
        ctx.beginPath()
        ctx.arc(px, py, Math.max(1, cell * 0.05), 0, Math.PI * 2)
        ctx.fill()
        continue
      }
      glow(px, py + cell * 0.1, cell * 0.7 * lit, props.fill.flameDeep, 0.2 * lit)
      drawFlame(px, py, cell * 0.3, lit, px * 0.13)
    }

    for (const tp of trail) {
      const age = (now - tp.bornAt) / TRAIL_LIFE
      if (age >= 1) continue
      const decay = Math.min(1, (1 - age) * 1.4) * (0.8 + 0.2 * Math.sin(t * 13 + tp.seed))
      drawFlame(tp.x, tp.y, cell * (0.1 + 0.16 * (1 - age)), decay * 0.85, tp.seed)
    }

    ctx.globalCompositeOperation = blend
    glow(bx, by, cell * (2 + bump * 0.8), props.fill.flameDeep, 0.35 + fl * 0.25 + bump * 0.2)
    ctx.globalCompositeOperation = 'source-over'
    const ballSize = cell * 0.5 * (1 + bump * 0.35)
    glow(bx, by, ballSize * 0.9, props.fill.flame, 0.75)
    drawFlame(bx, by + ballSize * 0.35, ballSize, 1, 3.7, -dirX * 0.8)

    if (!reduced && now - lastEmber > 70 && embers.length < 34) {
      lastEmber = now
      embers.push({
        x: bx,
        y: by - cell * 0.3,
        vx: (hash(now) - 0.5) * 0.9 - dirX * 0.5,
        vy: -0.5 - hash(now * 3) * 0.8,
        life: 1,
      })
    }
    for (let i = embers.length - 1; i >= 0; i--) {
      const em = embers[i]
      em.x += em.vx
      em.y += em.vy
      em.life -= 0.02
      if (em.life <= 0) {
        embers.splice(i, 1)
        continue
      }
      glow(em.x, em.y, cell * 0.12, props.fill.ember, em.life * 0.7)
    }

    if (!reduced && now - lastSmoke > 420 && smokes.length < 6 && trail.length > 4) {
      lastSmoke = now
      const src = trail[Math.floor(hash(now * 7) * trail.length)]
      smokes.push({ x: src.x, y: src.y, vx: (hash(now * 11) - 0.5) * 0.3, bornAt: now, seed: hash(now * 5) * 20 })
    }
    for (let i = smokes.length - 1; i >= 0; i--) {
      const sm = smokes[i]
      const age = (now - sm.bornAt) / 2600
      if (age >= 1) {
        smokes.splice(i, 1)
        continue
      }
      const sx = sm.x + sm.vx * age * 90 + Math.sin(t * 1.6 + sm.seed) * cell * 0.16
      const sy = sm.y - age * cell * 1.3
      glow(sx, sy, cell * (0.2 + age * 0.5), smokeColor, (1 - age) * 0.12)
    }

    if (fl > 0.02) {
      ctx.fillStyle = withAlpha(props.fill.flameDeep, fl * 0.24)
      ctx.fillRect(0, 0, w, h)
    }
  },
})
</script>

<template>
  <canvas ref="canvas" class="stolenflame-border-fill" aria-hidden="true" />
</template>

<style scoped>
.stolenflame-border-fill {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  max-width: none;
  max-height: none;
  pointer-events: none;
}
</style>
