<script setup lang="ts">
import { useElementCanvas } from '@/composables/useCanvasScene'
import type { GraveyardScene } from '@/types/api/items'
import { type Ctx, flickerNoise } from '@/utils/cosmetics/canvasShapes'
import { darken, lerpHex, lighten } from '@/utils/color'
import { withAlpha } from '@/utils/cosmetics/overlayCanvas'
import { drawBat, drawCrypt, drawDeadTree, drawHeadstone, drawIronFence, drawRaven, drawWisp, stoneTop, type GraveColors, type Stone } from '@/utils/cosmetics/graveyardScenery'
import { hash01, randBetween as rand } from '@/utils/random'
import { useTemplateRef } from 'vue'

const props = defineProps<{ scene: GraveyardScene }>()

interface Sprite {
  img: HTMLCanvasElement
  w: number
  h: number
  y: number
  x0: number
  speed: number
}

const HORIZON = 0.6
const MOON: [number, number] = [0.74, 0.22]
const MOON_R = 13
const BAT_PERIOD_S = 11
const BAT_CROSS_S = 3

let seed = 0
let base: HTMLCanvasElement | null = null
let clouds: Sprite[] = []
let fog: Sprite[] = []
let stones: Stone[] = []

function h01(n: number): number {
  return hash01(seed + n)
}

function layer(w: number, h: number, scale: number): [HTMLCanvasElement, Ctx | null] {
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.ceil(w * scale))
  c.height = Math.max(1, Math.ceil(h * scale))
  const ctx = c.getContext('2d')
  ctx?.setTransform(scale, 0, 0, scale, 0, 0)
  return [c, ctx]
}

function puff(ctx: Ctx, x: number, y: number, rx: number, ry: number, a: number): void {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(rx, ry)
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1)
  g.addColorStop(0, `rgba(255,255,255,${a})`)
  g.addColorStop(0.55, `rgba(255,255,255,${a * 0.5})`)
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(-1, -1, 2, 2)
  ctx.restore()
}

function puffSprite(i: number, cw: number, ch: number, scale: number, color: string, density: number): HTMLCanvasElement {
  const [c, ctx] = layer(cw, ch, scale)
  if (!ctx) return c
  for (let k = 0; k <= 40; k++) {
    const u = k / 40
    const taper = Math.pow(Math.sin(u * Math.PI), 0.5)
    const x = cw * 0.05 + u * cw * 0.9
    const y = ch * 0.5 + (h01(i * 71 + k) - 0.5) * ch * 0.5
    puff(ctx, x, y, (cw / 40) * (2.5 + h01(i * 97 + k) * 2), ch * (0.3 + h01(i * 53 + k) * 0.4) * taper, density * taper)
  }
  ctx.globalCompositeOperation = 'source-in'
  ctx.fillStyle = color
  ctx.fillRect(0, 0, cw, ch)
  return c
}

function buildSprites(w: number, h: number, s: number, scale: number): void {
  clouds = Array.from({ length: 3 }, (_, i) => {
    const cw = w * (0.4 + h01(i * 7) * 0.4)
    const ch = s * (10 + h01(i * 11) * 8)
    return { img: puffSprite(i, cw, ch, scale, darken(props.scene.skyBottom, 0.2), 0.5), w: cw, h: ch, y: h * (0.08 + i * 0.1) - ch / 2, x0: h01(i * 17) * (w + cw), speed: (w / 60) * (0.6 + h01(i * 19) * 0.6) }
  })
  fog = Array.from({ length: 4 }, (_, i) => {
    const cw = w * (0.5 + h01(i * 23) * 0.5)
    const ch = s * (8 + h01(i * 29) * 6)
    return { img: puffSprite(i + 10, cw, ch, scale, props.scene.fog, 0.3), w: cw, h: ch, y: h * (0.62 + i * 0.09) - ch / 2, x0: h01(i * 31) * (w + cw), speed: (w / 45) * (0.5 + h01(i * 37) * 0.7) * (i % 2 ? -1 : 1) }
  })
}

function spriteX(sp: Sprite, w: number, t: number): number {
  const span = w + sp.w
  return ((((sp.x0 + t * sp.speed) % span) + span) % span) - sp.w
}

function drawSky(ctx: Ctx, w: number, h: number, s: number): void {
  const g = ctx.createLinearGradient(0, 0, 0, h)
  g.addColorStop(0, props.scene.skyTop)
  g.addColorStop(1, props.scene.skyBottom)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  for (let i = 0; i < 26; i++) {
    ctx.fillStyle = withAlpha(props.scene.moon, 0.2 + h01(i * 5) * 0.5)
    ctx.beginPath()
    ctx.arc(h01(i * 3) * w, h01(i * 7) * h * 0.5, s * (0.2 + h01(i * 11) * 0.35), 0, Math.PI * 2)
    ctx.fill()
  }
  const [mx, my] = [w * MOON[0], h * MOON[1]]
  const halo = ctx.createRadialGradient(mx, my, MOON_R * s, mx, my, MOON_R * s * 3.5)
  halo.addColorStop(0, withAlpha(props.scene.moon, 0.16))
  halo.addColorStop(1, withAlpha(props.scene.moon, 0))
  ctx.fillStyle = halo
  ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = props.scene.moon
  ctx.beginPath()
  ctx.arc(mx, my, MOON_R * s, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = withAlpha(darken(props.scene.moon, 0.3), 0.3)
  for (const [ox, oy, r] of [[-0.3, -0.2, 0.28], [0.25, 0.15, 0.2], [-0.05, 0.45, 0.14]]) {
    ctx.beginPath()
    ctx.arc(mx + ox * MOON_R * s, my + oy * MOON_R * s, r * MOON_R * s, 0, Math.PI * 2)
    ctx.fill()
  }
}

function buildStones(w: number, h: number, s: number): Stone[] {
  const out: Stone[] = []
  for (let i = 0; i < 16; i++) {
    const u = h01(i * 3)
    out.push({ x: h01(i * 5) * w, y: h * (HORIZON + 0.06 + u * 0.34), s: s * (0.5 + u * 0.9), kind: Math.floor(h01(i * 7) * 4), lean: (h01(i * 11) - 0.5) * 0.24 })
  }
  return out.sort((a, b) => a.y - b.y)
}

function colors(): GraveColors {
  return { stone: props.scene.stone, ground: props.scene.ground, moon: props.scene.moon, sky: props.scene.skyBottom }
}

function buildBase(w: number, h: number, s: number, scale: number): HTMLCanvasElement {
  const [c, ctx] = layer(w, h, scale)
  if (!ctx) return c
  const col = colors()
  drawSky(ctx, w, h, s)
  ctx.fillStyle = lerpHex(props.scene.ground, props.scene.skyBottom, 0.3)
  ctx.beginPath()
  ctx.moveTo(0, h)
  for (let x = 0; x <= w; x += s * 2) ctx.lineTo(x, h * HORIZON - s * (2 + 3 * Math.sin((x / w) * 4.2 + 1)))
  ctx.lineTo(w, h)
  ctx.closePath()
  ctx.fill()
  drawCrypt(ctx, w * 0.5, h * HORIZON + s * 1, s, col)
  drawDeadTree(ctx, w * 0.12, h * HORIZON + s * 2, s, darken(props.scene.ground, 0.35), h01, 1)
  ctx.fillStyle = props.scene.ground
  ctx.fillRect(0, h * HORIZON + s * 4, w, h)
  drawIronFence(ctx, 0, w, h * HORIZON + s * 6, s, darken(props.scene.stone, 0.4))
  const moonX = w * MOON[0]
  for (const st of stones) drawHeadstone(ctx, st, col, moonX)
  const perch = stones[stones.length - 3]
  if (perch) drawRaven(ctx, perch.x, perch.y - stoneTop(perch), perch.s * 0.9, darken(props.scene.ground, 0.5))
  return c
}

function drawCandle(ctx: Ctx, w: number, h: number, s: number, t: number): void {
  const st = stones[4]
  if (!st) return
  const x = st.x + st.s * 5.5
  const y = st.y + st.s * 0.2
  const f = 0.7 + flickerNoise(t, 1.5) * 0.3
  const glow = ctx.createRadialGradient(x, y - s * 1.5, 0, x, y - s * 1.5, s * 7 * f)
  glow.addColorStop(0, withAlpha('#f2b552', 0.35 * f))
  glow.addColorStop(1, withAlpha('#f2b552', 0))
  ctx.fillStyle = glow
  ctx.fillRect(x - s * 8, y - s * 9, s * 16, s * 16)
  ctx.fillStyle = lighten(props.scene.stone, 0.4)
  ctx.fillRect(x - s * 0.6, y - s * 2.2, s * 1.2, s * 2.4)
  ctx.fillStyle = withAlpha('#ffe08a', 0.95)
  ctx.beginPath()
  ctx.ellipse(x, y - s * (2.8 + f * 0.4), s * 0.45, s * (0.7 + f * 0.4), 0, 0, Math.PI * 2)
  ctx.fill()
}

function drawBats(ctx: Ctx, w: number, h: number, s: number, t: number): void {
  const n = Math.floor(t / BAT_PERIOD_S)
  const phase = t - n * BAT_PERIOD_S
  if (phase >= BAT_CROSS_S) return
  const u = phase / BAT_CROSS_S
  for (let i = 0; i < 3; i++) {
    const x = w * (1.05 - u * 1.1 * (1 + i * 0.05)) + i * s * 6
    const y = h * 0.28 + Math.sin(u * 8 + i) * s * 4 + i * s * 3
    drawBat(ctx, x, y, s * 1.1, Math.sin(t * 22 + i), darken(props.scene.skyTop, 0.6))
  }
}

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')

useElementCanvas(canvasRef, {
  init(w, h, _now, scale) {
    seed = Math.floor(rand(0, 100000))
    const s = Math.min(w, h) / 110
    stones = buildStones(w, h, s)
    buildSprites(w, h, s, scale)
    base = buildBase(w, h, s, scale)
  },
  draw(ctx, w, h, now, reduced) {
    const t = reduced ? 3 : now / 1000
    const s = Math.min(w, h) / 110
    ctx.clearRect(0, 0, w, h)
    if (base) ctx.drawImage(base, 0, 0, w, h)
    for (const c of clouds) {
      ctx.globalAlpha = 0.85
      ctx.drawImage(c.img, spriteX(c, w, t), c.y, c.w, c.h)
    }
    ctx.globalAlpha = 1
    if (!reduced) drawBats(ctx, w, h, s, t)
    drawCandle(ctx, w, h, s, t)
    for (const f of fog) {
      ctx.globalAlpha = 0.5
      ctx.drawImage(f.img, spriteX(f, w, t), f.y, f.w, f.h)
    }
    ctx.globalAlpha = 1
    drawWisp(ctx, (lag) => [w * 0.5 + Math.sin((t - lag) * 0.6) * w * 0.3, h * (HORIZON + 0.14) + Math.sin((t - lag) * 1.7) * s * 6], s, props.scene.wisp ?? lighten(props.scene.stone, 0.45))
  },
})
</script>

<template>
  <canvas ref="canvas" class="graveyard-scene" aria-hidden="true" />
</template>

<style scoped>
.graveyard-scene {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  max-width: none;
  max-height: none;
  pointer-events: none;
}
</style>
