<script setup lang="ts">
import { useElementCanvas } from '@/composables/useCanvasScene'
import type { EclipseCreatureKind, EclipseFill } from '@/types/api/items'
import { darken, lerpHex, lighten } from '@/utils/color'
import { drawCreature, type CreaturePalette } from '@/utils/cosmetics/eclipseCreatures'
import { ECLIPSE_DAY_END, ECLIPSE_PARTIAL_END, ECLIPSE_SUN, ECLIPSE_SUN_R, ECLIPSE_PERIOD, ECLIPSE_TOTAL_END, eclipsePhase, type EclipsePhase } from '@/utils/cosmetics/eclipseCycle'
import { overlaySpace, withAlpha, type OverlaySpace } from '@/utils/cosmetics/overlayCanvas'
import { blitSceneLayer, paintSceneLayer } from '@/utils/cosmetics/sceneLayer'
import { hash01 } from '@/utils/random'
import { computed, useTemplateRef } from 'vue'
import type { Ctx } from '@/utils/cosmetics/canvasShapes'

const props = defineProps<{
  fill: EclipseFill
  margin?: number
}>()

const MARGIN = props.margin ?? 25
const SUN_Y = ECLIPSE_SUN[1]
const FLOCK = 7
const STARS = 48
const STATIC_T = 11.5
const GROUND_Y = 97.2
const WALKER_SCALE = 0.62

const pal = computed<CreaturePalette>(() => ({ shadow: props.fill.shadow, corona: props.fill.corona }))
const ink = computed(() => {
  const { sky, dusk, corona } = props.fill
  return {
    amber: lerpHex(darken(sky, 0.15), corona, 0.35),
    star: lighten(corona, 0.4),
    streamer: lighten(corona, 0.2),
    pale: lighten(corona, 0.5),
    moon: darken(dusk, 0.7),
  }
})

let groundFill: Path2D | null = null
let groundLine: Path2D | null = null
let groundDetail: HTMLCanvasElement | null = null

function skyColor(cover: number): string {
  const { amber } = ink.value
  if (cover < 0.6) return lerpHex(props.fill.sky, amber, cover / 0.6)
  return lerpHex(amber, props.fill.dusk, (cover - 0.6) / 0.4)
}

function drawSky(ctx: Ctx, w: number, h: number, sp: OverlaySpace, ph: EclipsePhase, top: string): void {
  const horizon = lerpHex(darken(top, 0.35), props.fill.corona, 0.45 * ph.tot)
  const g = ctx.createLinearGradient(0, sp.toY(-25), 0, sp.toY(125))
  g.addColorStop(0, top)
  g.addColorStop(0.7, lerpHex(top, horizon, 0.5))
  g.addColorStop(1, horizon)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  if (ph.cover < 0.7 || ph.cover >= 1) return
  const k = (ph.cover - 0.7) / 0.3
  ctx.strokeStyle = withAlpha(darken(top, 0.6), 0.16 * Math.sin(k * Math.PI))
  ctx.lineWidth = Math.max(1, sp.s * 1.2)
  for (let i = 0; i < 14; i++) {
    const off = ((ph.c * 30 + i * 11) % 160) - 30
    ctx.beginPath()
    ctx.moveTo(sp.toX(off - 40), sp.toY(-25))
    ctx.lineTo(sp.toX(off + 40), sp.toY(125))
    ctx.stroke()
  }
}

function drawClouds(ctx: Ctx, sp: OverlaySpace, ph: EclipsePhase, top: string): void {
  const alpha = 0.5 * (1 - ph.cover * 0.85)
  if (alpha <= 0.02) return
  ctx.fillStyle = withAlpha(lighten(top, 0.25), alpha)
  for (let i = 0; i < 5; i++) {
    const y = -18 + hash01(i * 5) * 60
    const x = (((ph.c * (1.2 + hash01(i * 3)) + hash01(i * 7) * 160) % 170) + 170) % 170 - 35
    const wdt = 8 + hash01(i * 11) * 10
    for (let k = 0; k < 4; k++) {
      ctx.beginPath()
      ctx.ellipse(sp.toX(x + k * wdt * 0.28), sp.toY(y + Math.sin(k * 2.1) * 0.8), wdt * 0.22 * sp.s, (1.4 + (k % 2) * 0.9) * sp.s, 0, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

function drawStars(ctx: Ctx, sp: OverlaySpace, ph: EclipsePhase): void {
  if (ph.tot <= 0) return
  ctx.fillStyle = ink.value.star
  for (let i = 0; i < STARS; i++) {
    const tw = 0.5 + 0.5 * Math.sin(ph.c * (2 + hash01(i * 3)) + i)
    ctx.globalAlpha = ph.tot * (0.35 + 0.55 * tw)
    ctx.beginPath()
    ctx.arc(sp.toX(hash01(i * 7) * 150 - 25), sp.toY(hash01(i * 11) * 118 - 25), (0.35 + hash01(i * 13) * 0.55) * sp.s, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

function drawCorona(ctx: Ctx, sp: OverlaySpace, ph: EclipsePhase): void {
  if (ph.tot <= 0) return
  const [cx, cy] = [sp.toX(ph.sunX), sp.toY(SUN_Y)]
  const r = ECLIPSE_SUN_R * sp.s
  const glow = ctx.createRadialGradient(cx, cy, r, cx, cy, r * 5)
  glow.addColorStop(0, withAlpha(props.fill.corona, 0.7 * ph.tot))
  glow.addColorStop(1, withAlpha(props.fill.corona, 0))
  ctx.fillStyle = glow
  ctx.fillRect(cx - r * 5.5, cy - r * 5.5, r * 11, r * 11)
  ctx.strokeStyle = withAlpha(ink.value.streamer, 0.7 * ph.tot)
  ctx.lineCap = 'round'
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2 + ph.c * 0.12
    const plume = Math.abs(Math.cos(a)) > 0.92 ? 2.2 : 1
    const len = r * (2 + 1.3 * Math.abs(Math.sin(i * 2.3 + ph.c * 0.7))) * plume
    ctx.lineWidth = Math.max(0.6, (i % 2 ? 0.5 : 0.9) * sp.s)
    ctx.beginPath()
    ctx.moveTo(cx + Math.cos(a) * r * 1.05, cy + Math.sin(a) * r * 1.05)
    ctx.quadraticCurveTo(cx + Math.cos(a + 0.12) * (r + len * 0.5), cy + Math.sin(a + 0.12) * (r + len * 0.5), cx + Math.cos(a) * (r + len), cy + Math.sin(a) * (r + len))
    ctx.stroke()
  }
  ctx.strokeStyle = withAlpha(props.fill.prominence, 0.9 * ph.tot)
  ctx.lineWidth = Math.max(0.6, 0.6 * sp.s)
  for (let i = 0; i < 4; i++) {
    const a = i * 1.7 + ph.c * 0.05
    const px = cx + Math.cos(a) * r
    const py = cy + Math.sin(a) * r
    const h = r * (0.25 + 0.15 * Math.sin(ph.c * 3 + i))
    ctx.beginPath()
    ctx.moveTo(px - Math.sin(a) * r * 0.12, py + Math.cos(a) * r * 0.12)
    ctx.quadraticCurveTo(px + Math.cos(a) * h, py + Math.sin(a) * h, px + Math.sin(a) * r * 0.12, py - Math.cos(a) * r * 0.12)
    ctx.stroke()
  }
}

function drawFlash(ctx: Ctx, w: number, h: number, ph: EclipsePhase): void {
  if (ph.flash <= 0.01) return
  ctx.fillStyle = `rgba(255, 255, 255, ${0.55 * ph.flash})`
  ctx.fillRect(0, 0, w, h)
}

function drawDapples(ctx: Ctx, sp: OverlaySpace, ph: EclipsePhase): void {
  const k = ph.cover > 0.35 && ph.cover < 1 ? Math.sin(((ph.cover - 0.35) / 0.65) * Math.PI) : 0
  if (k <= 0) return
  const dir = ph.c < ECLIPSE_TOTAL_END ? 1 : -1
  ctx.fillStyle = withAlpha(ink.value.pale, 0.35 * k)
  for (let i = 0; i < 24; i++) {
    const x = -20 + ((hash01(i * 7) * 140 + ph.c * 1.5) % 140)
    const y = groundY(x) + 0.6 + hash01(i * 11) * 1.4
    const r = (0.7 + hash01(i * 3) * 0.5) * sp.s
    ctx.beginPath()
    ctx.arc(sp.toX(x), sp.toY(y), r, 0, Math.PI * 2)
    ctx.arc(sp.toX(x) + dir * r * (0.45 + 0.5 * ph.cover), sp.toY(y), r * 0.95, 0, Math.PI * 2, true)
    ctx.fill()
  }
}

function drawFlock(ctx: Ctx, sp: OverlaySpace, ph: EclipsePhase): void {
  const flee = ph.c >= ECLIPSE_DAY_END && ph.c < ECLIPSE_DAY_END + 2.2 ? (ph.c - ECLIPSE_DAY_END) / 2.2 : -1
  const back = ph.c >= ECLIPSE_TOTAL_END + 0.6 && ph.c < Math.min(ECLIPSE_PERIOD, ECLIPSE_TOTAL_END + 2.8) ? (ph.c - ECLIPSE_TOTAL_END - 0.6) / 2.2 : -1
  const u = flee >= 0 ? flee : back
  if (u < 0) return
  for (let i = 0; i < FLOCK; i++) {
    const side = i % 2 ? 1 : -1
    const lag = i * 0.06
    const p = Math.max(0, Math.min(1, u - lag))
    const q = flee >= 0 ? p : 1 - p
    const along = q < 0.5 ? q * 2 : 1
    const down = q < 0.5 ? 0 : (q - 0.5) * 2
    const x = 50 + side * (4 + along * 44) + Math.sin(q * 11 + i) * 1.2
    const y = 3 + (i % 3) * 1.1 + down * 70 + Math.sin(q * 9 + i) * 1.5
    ctx.globalAlpha = Math.sin(p * Math.PI)
    drawCreature(ctx, 'raven', { x: sp.toX(x), y: sp.toY(y), s: sp.s * 0.55, t: ph.c * 1.5 + i, dir: flee >= 0 ? side : -side, seed: i }, pal.value)
  }
  ctx.globalAlpha = 1
}

function drawSunAndMoon(ctx: Ctx, sp: OverlaySpace, ph: EclipsePhase): void {
  const [cx, cy] = [sp.toX(ph.sunX), sp.toY(SUN_Y)]
  const r = ECLIPSE_SUN_R * sp.s
  if (ph.cover < 1) {
    const halo = ctx.createRadialGradient(cx, cy, r * 0.8, cx, cy, r * 2.6)
    halo.addColorStop(0, withAlpha(props.fill.corona, 0.45 * (1 - ph.cover)))
    halo.addColorStop(1, withAlpha(props.fill.corona, 0))
    ctx.fillStyle = halo
    ctx.fillRect(cx - r * 3, cy - r * 3, r * 6, r * 6)
  }
  ctx.fillStyle = ink.value.pale
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = ink.value.moon
  ctx.beginPath()
  ctx.arc(sp.toX(ph.moonX), cy, r * 1.02, 0, Math.PI * 2)
  ctx.fill()
  drawBeads(ctx, sp, ph, cx, cy, r)
}

function drawBeads(ctx: Ctx, sp: OverlaySpace, ph: EclipsePhase, cx: number, cy: number, r: number): void {
  const edge = 1 - Math.abs(ph.moonX - ph.sunX) / (ECLIPSE_SUN_R * 0.5)
  if (edge <= 0 || ph.cover >= 1) return
  const side = ph.moonX < ph.sunX ? 1 : -1
  const flash = Math.pow(edge, 3)
  const ring = ctx.createRadialGradient(cx + side * r, cy, 0, cx + side * r, cy, r * 1.6)
  ring.addColorStop(0, `rgba(255, 255, 255, ${0.9 * flash})`)
  ring.addColorStop(1, withAlpha(props.fill.corona, 0))
  ctx.fillStyle = ring
  ctx.fillRect(cx - r * 3, cy - r * 3, r * 6, r * 6)
  ctx.fillStyle = `rgba(255, 255, 255, ${0.9 * edge})`
  for (let i = -2; i <= 2; i++) {
    const a = side > 0 ? i * 0.35 : Math.PI + i * 0.35
    ctx.beginPath()
    ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, sp.s * 0.35 * (1 - Math.abs(i) * 0.25), 0, Math.PI * 2)
    ctx.fill()
  }
}

function groundY(x: number): number {
  return GROUND_Y + Math.sin(x * 0.21) * 0.9 + Math.sin(x * 0.07 + 1) * 1.1
}

function buildGround(sp: OverlaySpace): void {
  groundFill = new Path2D()
  groundLine = new Path2D()
  groundFill.moveTo(sp.toX(-25), sp.toY(125))
  for (let x = -25; x <= 125; x += 2) {
    const px = sp.toX(x)
    const py = sp.toY(groundY(x))
    groundFill.lineTo(px, py)
    if (x === -25) groundLine.moveTo(px, py)
    else groundLine.lineTo(px, py)
  }
  groundFill.lineTo(sp.toX(125), sp.toY(125))
  groundFill.closePath()
}

function drawGround(ctx: Ctx, sp: OverlaySpace, ph: EclipsePhase): void {
  if (!groundFill || !groundLine) buildGround(sp)
  if (!groundDetail) groundDetail = paintSceneLayer(ctx, (lctx) => drawGroundDetail(lctx, sp))
  const shadow = props.fill.shadow
  const g = ctx.createLinearGradient(0, sp.toY(GROUND_Y - 2), 0, sp.toY(125))
  g.addColorStop(0, lerpHex(shadow, props.fill.corona, 0.08 * ph.tot))
  g.addColorStop(1, shadow)
  ctx.fillStyle = g
  if (groundFill) ctx.fill(groundFill)
  ctx.strokeStyle = withAlpha(props.fill.corona, 0.35 * ph.tot + 0.12)
  ctx.lineWidth = Math.max(0.5, 0.35 * sp.s)
  if (groundLine) ctx.stroke(groundLine)
  blitSceneLayer(ctx, groundDetail, 'source-over')
}

function drawGroundDetail(ctx: Ctx, sp: OverlaySpace): void {
  ctx.fillStyle = props.fill.shadow
  ctx.strokeStyle = props.fill.shadow
  ctx.lineCap = 'round'
  for (let i = 0; i < 26; i++) {
    const x = -22 + i * 5.7 + hash01(i * 3) * 3
    const y = groundY(x)
    ctx.lineWidth = Math.max(0.4, 0.3 * sp.s)
    for (let k = -1; k <= 1; k++) {
      ctx.beginPath()
      ctx.moveTo(sp.toX(x), sp.toY(y + 0.3))
      ctx.lineTo(sp.toX(x + k * (0.7 + hash01(i * 7 + k) * 0.6)), sp.toY(y - 1.3 - hash01(i * 5 + k) * 1.4))
      ctx.stroke()
    }
  }
  for (const [x, lean] of [[-14, -0.2], [113, 0.25]] as [number, number][]) {
    ctx.lineWidth = Math.max(0.6, 0.9 * sp.s)
    ctx.beginPath()
    ctx.moveTo(sp.toX(x), sp.toY(groundY(x) + 0.5))
    ctx.quadraticCurveTo(sp.toX(x + lean * 6), sp.toY(groundY(x) - 6), sp.toX(x + lean * 10), sp.toY(groundY(x) - 12))
    ctx.stroke()
    ctx.lineWidth = Math.max(0.5, 0.5 * sp.s)
    for (const [dx, dy, ex, ey] of [[2, -6, 6, -9.5], [3, -8.5, 1, -12], [-1, -5, -4, -8]]) {
      ctx.beginPath()
      ctx.moveTo(sp.toX(x + lean * 6 + dx * 0.5), sp.toY(groundY(x) + dy))
      ctx.lineTo(sp.toX(x + lean * 6 + ex), sp.toY(groundY(x) + ey))
      ctx.stroke()
    }
  }
  for (const x of [22, 78]) {
    ctx.fillRect(sp.toX(x), sp.toY(groundY(x) - 3.2), 0.8 * sp.s, 3.6 * sp.s)
    ctx.fillRect(sp.toX(x - 3), sp.toY(groundY(x) - 2.2), 6.8 * sp.s, 0.5 * sp.s)
  }
  for (let i = 0; i < 5; i++) {
    const x = 5 + i * 22 + hash01(i * 9) * 8
    ctx.beginPath()
    ctx.ellipse(sp.toX(x), sp.toY(groundY(x) + 0.2), (1 + hash01(i * 4)) * sp.s, 0.8 * sp.s, 0, Math.PI, 0)
    ctx.fill()
  }
}

function walkerX(c: number, from: number, to: number, dur: number, offset: number): number {
  const u = (((c - ECLIPSE_PARTIAL_END + offset) % dur) + dur) % dur / dur
  return from + (to - from) * u
}

function drawWalkers(ctx: Ctx, sp: OverlaySpace, ph: EclipsePhase, kinds: EclipseCreatureKind[]): void {
  const rise = (1 - ph.out) * 12
  const cycle = ph.cycle
  kinds.forEach((kind, i) => {
    const flip = hash01(cycle * 7 + i * 3) < 0.5
    const dir = (i % 2 ? 1 : -1) * (flip ? -1 : 1)
    const speed = 6.5 + i * 1.7 + hash01(cycle * 11 + i) * 3
    const x = dir > 0 ? walkerX(ph.c, -12, 112, speed, i * 2.4) : walkerX(ph.c, 112, -12, speed, i * 2.4)
    const y = groundY(x) + 0.4 + rise
    drawCreature(ctx, kind, { x: sp.toX(x), y: sp.toY(y), s: sp.s * WALKER_SCALE, t: ph.c + i, dir, seed: i }, pal.value)
  })
}

function drawDrifters(ctx: Ctx, sp: OverlaySpace, ph: EclipsePhase, kinds: EclipseCreatureKind[]): void {
  const slide = (1 - ph.out) * 14
  kinds.forEach((kind, i) => {
    for (const side of [-1, 1]) {
      const x = side < 0 ? 3 - slide - i * 1.5 : 97 + slide + i * 1.5
      const y = 50 + Math.sin(ph.c * (0.7 + i * 0.15) + side * 1.3 + i) * 30
      drawCreature(ctx, kind, { x: sp.toX(x), y: sp.toY(y), s: sp.s * 0.85, t: ph.c + i, dir: side < 0 ? 1 : -1, seed: i * 2 + side }, pal.value)
    }
  })
}

function drawFlyers(ctx: Ctx, sp: OverlaySpace, ph: EclipsePhase, kinds: EclipseCreatureKind[]): void {
  for (let i = 0; i < 3; i++) {
    const kind = kinds[i % kinds.length]
    if (!kind) return
    const a = ph.c * (1.1 + i * 0.2) + i * 2.1
    const ox = ph.sunX + Math.cos(a) * (10 + i * 2.5)
    const oy = SUN_Y + Math.sin(a) * (3.5 + i * 0.8)
    const sx = i % 2 ? -8 : 108
    const x = ox + (sx - ox) * (1 - ph.out)
    const y = oy + (100 - oy) * (1 - ph.out)
    drawCreature(ctx, kind, { x: sp.toX(x), y: sp.toY(y), s: sp.s * (i === 0 ? 1 : 0.8), t: ph.c, dir: Math.sin(a) > 0 ? 1 : -1, seed: i }, pal.value)
  }
}

function drawSwarm(ctx: Ctx, sp: OverlaySpace, ph: EclipsePhase, kind: EclipseCreatureKind): void {
  for (let i = 0; i < 6; i++) {
    const life = 1.6
    const local = ((ph.c - ECLIPSE_PARTIAL_END + i * 0.9) % (life * 3) + life * 3) % (life * 3)
    if (local > life) continue
    const u = local / life
    const fromLeft = i % 2 === 0
    const x = fromLeft ? -6 + u * 112 : 106 - u * 112
    const y = 104 - u * 108 + Math.sin(u * 9 + i) * 3
    ctx.globalAlpha = ph.out * Math.sin(u * Math.PI)
    drawCreature(ctx, kind, { x: sp.toX(x), y: sp.toY(y), s: sp.s * 0.8, t: ph.c, dir: fromLeft ? 1 : -1, seed: i }, pal.value)
  }
  ctx.globalAlpha = 1
}

function drawCreatures(ctx: Ctx, sp: OverlaySpace, ph: EclipsePhase): void {
  if (ph.out <= 0) return
  const r = props.fill.roster
  drawDrifters(ctx, sp, ph, r.drifters)
  drawFlyers(ctx, sp, ph, r.flyers)
  drawSwarm(ctx, sp, ph, r.swarm)
  drawWalkers(ctx, sp, ph, r.walkers)
}

function drawScene(ctx: Ctx, w: number, h: number, t: number): void {
  const sp = overlaySpace(w, h, MARGIN)
  const ph = eclipsePhase(t)
  const top = skyColor(ph.cover)
  drawSky(ctx, w, h, sp, ph, top)
  drawClouds(ctx, sp, ph, top)
  drawStars(ctx, sp, ph)
  drawCorona(ctx, sp, ph)
  drawSunAndMoon(ctx, sp, ph)
  drawGround(ctx, sp, ph)
  drawDapples(ctx, sp, ph)
  drawFlock(ctx, sp, ph)
  drawCreatures(ctx, sp, ph)
  drawFlash(ctx, w, h, ph)
}

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')

useElementCanvas(canvasRef, {
  init() {},
  resize() {
    groundFill = null
    groundLine = null
    groundDetail = null
  },
  draw(ctx, w, h, now, reduced) {
    ctx.clearRect(0, 0, w, h)
    drawScene(ctx, w, h, reduced ? STATIC_T : now / 1000)
  },
})
</script>

<template>
  <canvas ref="canvas" class="eclipse-border-fill" aria-hidden="true" />
</template>

<style scoped>
.eclipse-border-fill {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  max-width: none;
  max-height: none;
  pointer-events: none;
}
</style>
