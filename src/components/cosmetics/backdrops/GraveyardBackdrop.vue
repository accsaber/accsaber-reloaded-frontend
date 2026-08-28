<script setup lang="ts">
import { useBackdropCanvas } from '@/composables/useCanvasScene'
import { type Ctx, sceneUnit } from '@/utils/cosmetics/canvasShapes'
import { darken, lerpHex, lighten } from '@/utils/color'
import { drawBat, drawCrypt, drawDeadTree, drawHeadstone, drawIronFence, drawRaven, drawWisp, stoneTop, type GraveColors, type Stone } from '@/utils/cosmetics/graveyardScenery'
import { withAlpha } from '@/utils/cosmetics/overlayCanvas'
import { hash01, randBetween as rand } from '@/utils/random'
import type { GraveyardBackdropConfig } from '@/utils/cosmetics/themeBackdrop'
import { useTemplateRef } from 'vue'

const props = defineProps<{
  config: GraveyardBackdropConfig
}>()

interface Sprite {
  img: HTMLCanvasElement
  w: number
  h: number
  y: number
  x0: number
  speed: number
}

const STATIC_T = 5
const HORIZON = 0.58
const MOON: [number, number] = [0.76, 0.2]
const MOON_R = 16
const STONES = 34
const GHOST_PERIOD_S = 22
const BAT_PERIOD_S = 13
const BAT_CROSS_S = 4

let seed = 0
let unit = 1
let startTime = 0
let base: HTMLCanvasElement | null = null
let clouds: Sprite[] = []
let fog: Sprite[] = []
let stones: Stone[] = []
let ghostPlot: Stone | null = null

function h01(n: number): number {
  return hash01(seed + n)
}

function colors(): GraveColors {
  return { stone: props.config.stoneColor, ground: props.config.groundColor, moon: props.config.moonColor, sky: props.config.skyColors[1] ?? props.config.skyColors[0] ?? '#0d1220' }
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
  for (let k = 0; k <= 50; k++) {
    const u = k / 50
    const taper = Math.pow(Math.sin(u * Math.PI), 0.5)
    puff(ctx, cw * 0.05 + u * cw * 0.9, ch * 0.5 + (h01(i * 71 + k) - 0.5) * ch * 0.5, (cw / 50) * (2.5 + h01(i * 97 + k) * 2), ch * (0.3 + h01(i * 53 + k) * 0.4) * taper, density * taper)
  }
  ctx.globalCompositeOperation = 'source-in'
  ctx.fillStyle = color
  ctx.fillRect(0, 0, cw, ch)
  return c
}

function buildSprites(w: number, h: number, scale: number): void {
  clouds = Array.from({ length: 4 }, (_, i) => {
    const cw = w * (0.35 + h01(i * 7) * 0.4)
    const ch = unit * (12 + h01(i * 11) * 10)
    return { img: puffSprite(i, cw, ch, scale, darken(props.config.skyColors[1] ?? '#0d1220', 0.25), 0.5), w: cw, h: ch, y: h * (0.06 + i * 0.09) - ch / 2, x0: h01(i * 17) * (w + cw), speed: (w / 90) * (0.5 + h01(i * 19) * 0.6) }
  })
  fog = Array.from({ length: 5 }, (_, i) => {
    const cw = w * (0.45 + h01(i * 23) * 0.5)
    const ch = unit * (9 + h01(i * 29) * 8)
    return { img: puffSprite(i + 10, cw, ch, scale, props.config.fogColor, 0.28), w: cw, h: ch, y: h * (0.6 + i * 0.085) - ch / 2, x0: h01(i * 31) * (w + cw), speed: (w / 70) * (0.4 + h01(i * 37) * 0.7) * (i % 2 ? -1 : 1) }
  })
}

function spriteX(sp: Sprite, w: number, t: number): number {
  const span = w + sp.w
  return ((((sp.x0 + t * sp.speed) % span) + span) % span) - sp.w
}

function buildStones(w: number, h: number): Stone[] {
  const out: Stone[] = []
  for (let i = 0; i < STONES; i++) {
    const u = Math.pow(h01(i * 3), 0.85)
    out.push({ x: h01(i * 5) * w, y: h * (HORIZON + 0.06 + u * 0.36), s: unit * (0.55 + u * 1.6), kind: Math.floor(h01(i * 7) * 4), lean: (h01(i * 11) - 0.5) * 0.24 })
  }
  return out.sort((a, b) => a.y - b.y)
}

function drawSky(ctx: Ctx, w: number, h: number): void {
  const g = ctx.createLinearGradient(0, 0, 0, h)
  const cs = props.config.skyColors
  cs.forEach((c, i) => g.addColorStop(i / Math.max(1, cs.length - 1), c))
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  for (let i = 0; i < 70; i++) {
    ctx.fillStyle = withAlpha(props.config.moonColor, 0.15 + h01(i * 5) * 0.5)
    ctx.beginPath()
    ctx.arc(h01(i * 3) * w, h01(i * 7) * h * 0.5, unit * (0.15 + h01(i * 11) * 0.3), 0, Math.PI * 2)
    ctx.fill()
  }
  const [mx, my] = [w * MOON[0], h * MOON[1]]
  const r = MOON_R * unit
  const halo = ctx.createRadialGradient(mx, my, r, mx, my, r * 3.5)
  halo.addColorStop(0, withAlpha(props.config.moonColor, 0.16))
  halo.addColorStop(1, withAlpha(props.config.moonColor, 0))
  ctx.fillStyle = halo
  ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = props.config.moonColor
  ctx.beginPath()
  ctx.arc(mx, my, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = withAlpha(darken(props.config.moonColor, 0.3), 0.3)
  for (const [ox, oy, rr] of [[-0.3, -0.2, 0.28], [0.25, 0.15, 0.2], [-0.05, 0.45, 0.14], [0.35, -0.5, 0.1]]) {
    ctx.beginPath()
    ctx.arc(mx + ox * r, my + oy * r, rr * r, 0, Math.PI * 2)
    ctx.fill()
  }
}

function hill(ctx: Ctx, w: number, h: number, base: number, amp: number, sd: number, color: string): void {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(0, h)
  for (let x = 0; x <= w; x += unit * 2) {
    const u = x / w
    ctx.lineTo(x, base - amp * (0.5 + 0.5 * Math.sin(u * 4.2 + sd) * Math.sin(u * 2.1 + sd * 2)))
  }
  ctx.lineTo(w, h)
  ctx.closePath()
  ctx.fill()
}

function drawOpenGrave(ctx: Ctx, x: number, y: number, s: number): void {
  ctx.fillStyle = darken(props.config.groundColor, 0.55)
  ctx.beginPath()
  ctx.ellipse(x, y, s * 9, s * 3.2, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = lighten(props.config.groundColor, 0.18)
  ctx.beginPath()
  ctx.ellipse(x + s * 11, y - s * 1.5, s * 4.5, s * 2.6, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = props.config.treeColor
  ctx.lineWidth = s * 0.5
  ctx.beginPath()
  ctx.moveTo(x + s * 12, y - s * 3)
  ctx.lineTo(x + s * 16, y - s * 14)
  ctx.stroke()
  ctx.fillStyle = lighten(props.config.stoneColor, 0.2)
  ctx.beginPath()
  ctx.moveTo(x + s * 11, y - s * 1.5)
  ctx.lineTo(x + s * 14, y - s * 5)
  ctx.lineTo(x + s * 11, y - s * 6.5)
  ctx.lineTo(x + s * 8.5, y - s * 3.5)
  ctx.closePath()
  ctx.fill()
}

function buildBase(w: number, h: number, scale: number): HTMLCanvasElement {
  const [c, ctx] = layer(w, h, scale)
  if (!ctx) return c
  const col = colors()
  drawSky(ctx, w, h)
  const far = lerpHex(props.config.groundColor, col.sky, 0.3)
  hill(ctx, w, h, h * HORIZON - unit * 6, unit * 14, 0.3, far)
  drawCrypt(ctx, w * 0.5, h * HORIZON + unit * 2, unit * 1.6, col)
  drawDeadTree(ctx, w * 0.1, h * HORIZON + unit * 2, unit * 1.4, props.config.treeColor, h01, 1)
  drawDeadTree(ctx, w * 0.9, h * HORIZON + unit * 1, unit * 1.1, props.config.treeColor, h01, 5)
  ctx.fillStyle = props.config.groundColor
  ctx.fillRect(0, h * HORIZON + unit * 4, w, h)
  drawIronFence(ctx, 0, w, h * HORIZON + unit * 9, unit * 1.2, darken(props.config.stoneColor, 0.4))
  drawRaven(ctx, w * 0.31, h * HORIZON + unit * 9 - unit * 12.6, unit * 0.9, props.config.treeColor)
  drawRaven(ctx, w * 0.66, h * HORIZON + unit * 9 - unit * 12.6, unit * 0.8, props.config.treeColor)
  const moonX = w * MOON[0]
  for (const st of stones) drawHeadstone(ctx, st, col, moonX)
  const perch = stones[stones.length - 4]
  if (perch) drawRaven(ctx, perch.x, perch.y - stoneTop(perch), perch.s * 0.9, props.config.treeColor)
  const plot = stones[Math.floor(stones.length * 0.62)]
  if (plot) drawOpenGrave(ctx, plot.x + plot.s * 10, plot.y + plot.s * 2, plot.s * 1.1)
  return c
}

function drawGhost(ctx: Ctx, w: number, h: number, t: number): void {
  if (!props.config.ghosts || !ghostPlot) return
  const local = t % GHOST_PERIOD_S
  const start = 4 + h01(Math.floor(t / GHOST_PERIOD_S) * 7) * 8
  const u = (local - start) / 7
  if (u < 0 || u > 1) return
  const s = ghostPlot.s * 7
  const rise = Math.min(1, u / 0.45)
  const x = ghostPlot.x + Math.sin(u * 4.2) * s * 0.9 + u * s * 1.5
  const y = ghostPlot.y - rise * s * 1.4 - Math.max(0, u - 0.45) * s * 2.2
  const a = (u < 0.2 ? u / 0.2 : u > 0.75 ? 1 - (u - 0.75) / 0.25 : 1) * 0.55
  ctx.save()
  ctx.beginPath()
  ctx.rect(0, 0, w, ghostPlot.y + unit)
  ctx.clip()
  ctx.fillStyle = withAlpha(props.config.ghostColor, a)
  ctx.beginPath()
  ctx.arc(x, y - s * 0.5, s * 0.5, Math.PI, 0)
  ctx.lineTo(x + s * 0.5, y + s * 0.6)
  for (let i = 0; i < 4; i++) {
    const x0 = x + s * 0.5 - (i * s) / 4
    ctx.quadraticCurveTo(x0 - s / 8, y + s * 0.6 + s * (0.16 + 0.06 * Math.sin(t * 5 + i)), x0 - s / 4, y + s * 0.6)
  }
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = withAlpha(darken(props.config.ghostColor, 0.85), a)
  for (const ex of [-0.16, 0.16]) {
    ctx.beginPath()
    ctx.ellipse(x + ex * s, y - s * 0.5, s * 0.07, s * 0.11, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.beginPath()
  ctx.ellipse(x, y - s * 0.2, s * 0.08, s * 0.14, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawBats(ctx: Ctx, w: number, h: number, t: number): void {
  if (!props.config.bats) return
  const n = Math.floor(t / BAT_PERIOD_S)
  const phase = t - n * BAT_PERIOD_S
  if (phase >= BAT_CROSS_S) return
  const u = phase / BAT_CROSS_S
  for (let i = 0; i < 4; i++) {
    const x = w * (1.05 - u * 1.12 * (1 + i * 0.04)) + i * unit * 9
    const y = h * (0.22 + h01(n * 5 + i) * 0.12) + Math.sin(u * 8 + i) * unit * 5
    drawBat(ctx, x, y, unit * (1.4 + h01(n * 9 + i) * 0.6), Math.sin(t * 22 + i), props.config.batColor)
  }
}

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')

useBackdropCanvas(canvasRef, {
  init(w, h, now, scale) {
    startTime = now
    seed = Math.floor(rand(0, 100000))
    unit = sceneUnit(w, h)
    stones = buildStones(w, h)
    ghostPlot = stones[Math.floor(stones.length * 0.5)] ?? null
    buildSprites(w, h, scale)
    base = buildBase(w, h, scale)
  },
  draw(ctx, w, h, now, reduced) {
    const t = reduced ? STATIC_T : (now - startTime) / 1000
    if (base) ctx.drawImage(base, 0, 0, w, h)
    for (const c of clouds) {
      ctx.globalAlpha = 0.85
      ctx.drawImage(c.img, spriteX(c, w, t), c.y, c.w, c.h)
    }
    ctx.globalAlpha = 1
    drawBats(ctx, w, h, t)
    drawGhost(ctx, w, h, t)
    for (const f of fog) {
      ctx.globalAlpha = 0.45
      ctx.drawImage(f.img, spriteX(f, w, t), f.y, f.w, f.h)
    }
    ctx.globalAlpha = 1
    if (props.config.wisps && !reduced) {
      drawWisp(ctx, (lag) => [w * 0.5 + Math.sin((t - lag) * 0.5) * w * 0.32, h * (HORIZON + 0.2) + Math.sin((t - lag) * 1.7) * unit * 8], unit, props.config.wispColor)
    }
  },
})
</script>

<template>
  <canvas
    ref="canvas"
    class="graveyard-backdrop"
    :style="{ opacity: config.opacity }"
    aria-hidden="true"
  />
</template>

<style scoped>
.graveyard-backdrop {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  max-width: none;
  max-height: none;
  z-index: -1;
  pointer-events: none;
}
</style>
