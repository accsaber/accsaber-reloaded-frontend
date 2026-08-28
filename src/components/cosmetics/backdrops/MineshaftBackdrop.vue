<script setup lang="ts">
import { useBackdropCanvas } from '@/composables/useCanvasScene'
import { type Ctx, fillCircle, flickerNoise, makeProjector, type Point, type Projector, sceneUnit } from '@/utils/cosmetics/canvasShapes'
import { darken, lerpHex, lighten } from '@/utils/color'
import { frameDelta, withAlpha } from '@/utils/cosmetics/overlayCanvas'
import { hash01, randBetween as rand } from '@/utils/random'
import { blitSceneLayer, paintSceneLayer } from '@/utils/cosmetics/sceneLayer'
import type { MineshaftBackdropConfig } from '@/utils/cosmetics/themeBackdrop'
import { useTemplateRef } from 'vue'

const props = defineProps<{
  config: MineshaftBackdropConfig
}>()

interface Mote {
  x: number
  y: number
  speed: number
}

const BLACK = '#000000'
const STATIC_T = 5
const RAIL_X = 0.45
const RAIL_HW = 0.03
const FAR_Z = 9
const PIVOT_X = 0.2
const CHAIN = 34
const GRAV = 6.8
const DAMP = 0.16
const LINKS = 9

let motes: Mote[] = []
let startTime = 0
let lastNow = 0
let unit = 1
let seed = 0
let project: Projector = makeProjector(0, 0, 1)
let scene: HTMLCanvasElement | null = null
let theta = 0.35
let omega = 0
let nextGust = 3

function h01(n: number): number {
  return hash01(seed + n)
}

function initScene(w: number, h: number) {
  unit = sceneUnit(w, h)
  seed = Math.floor(rand(0, 100000))
  project = makeProjector(w / 2, h * 0.5, w * 0.45)
  scene = null
  theta = rand(-0.4, 0.4)
  omega = 0
  nextGust = rand(2, 5)
  motes = Array.from({ length: 30 }, () => ({ x: Math.random(), y: Math.random(), speed: rand(0.08, 0.23) }))
}

function quad(ctx: Ctx, pts: Point[]): void {
  ctx.beginPath()
  ctx.moveTo(pts[0]?.[0] ?? 0, pts[0]?.[1] ?? 0)
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i]?.[0] ?? 0, pts[i]?.[1] ?? 0)
  ctx.closePath()
  ctx.fill()
}

function drawTimber(ctx: Ctx, z: number) {
  const shade = 1 - z / 7
  const l = project(-1.1, -1, z)
  const r = project(1.1, -1, z)
  const lb = project(-1.1, 1, z)
  const rb = project(1.1, 1, z)
  const tw = (9 / z + 2) * unit
  ctx.fillStyle = withAlpha(props.config.timberColor, 0.35 + shade * 0.65)
  ctx.fillRect(l[0] - tw, l[1], tw, lb[1] - l[1])
  ctx.fillRect(r[0], r[1], tw, rb[1] - r[1])
  ctx.fillRect(l[0] - tw, l[1] - tw, r[0] - l[0] + 2 * tw, tw)
  ctx.fillStyle = withAlpha(props.config.timberDark, 0.5 + shade * 0.5)
  ctx.fillRect(l[0] - tw, l[1] + 3 * unit, tw, unit)
  ctx.fillRect(r[0] + unit, r[1] + 6 * unit, tw - unit, unit)
  ctx.fillRect(l[0] - tw * 0.5, l[1] + tw * 0.2, tw * 0.25, tw * 0.25)
  ctx.fillRect(r[0] + tw * 0.25, r[1] + tw * 0.2, tw * 0.25, tw * 0.25)
}

function drawBallast(ctx: Ctx) {
  const gravel = lerpHex(props.config.timberDark, BLACK, 0.45)
  ctx.fillStyle = gravel
  quad(ctx, [project(-0.8, 1, 1), project(0.8, 1, 1), project(0.8, 1, FAR_Z), project(-0.8, 1, FAR_Z)])
  ctx.fillStyle = lighten(gravel, 0.25)
  for (let i = 0; i < 140; i++) {
    const z = 1 + Math.pow(h01(i * 3), 1.6) * 5
    const p = project((h01(i * 5) - 0.5) * 1.5, 1, z)
    fillCircle(ctx, p[0], p[1] - unit * 0.2, (0.35 + h01(i * 7) * 0.5) * unit * (1.6 / z))
  }
}

function drawSleeper(ctx: Ctx, z: number, k: number) {
  const skew = (h01(k * 11) - 0.5) * 0.08
  const top = lerpHex(props.config.timberDark, props.config.timberColor, 0.35)
  ctx.fillStyle = withAlpha(top, Math.min(1, 1.6 / z + 0.2))
  quad(ctx, [project(-0.64, 1, z), project(0.64, 1, z + skew), project(0.64, 1, z + 0.2 + skew), project(-0.64, 1, z + 0.2)])
  ctx.fillStyle = withAlpha(props.config.timberDark, Math.min(1, 1.6 / z + 0.2))
  quad(ctx, [project(-0.64, 1, z), project(0.64, 1, z + skew), project(0.64, 1.05, z + skew), project(-0.64, 1.05, z)])
  if (h01(k * 13) < 0.3) {
    ctx.fillStyle = withAlpha(BLACK, 0.7)
    const cx = (h01(k * 17) - 0.4) * 1.1
    quad(ctx, [project(cx, 1, z), project(cx + 0.02, 1, z + 0.05), project(cx - 0.01, 1, z + 0.2)])
  }
}

function drawRail(ctx: Ctx, xr: number) {
  const head = lighten(props.config.railColor, 0.45)
  let z = 1
  while (z < FAR_Z) {
    const z2 = Math.min(FAR_Z, z * 1.12 + 0.02)
    const a = Math.max(0, 1 - (z - 1) / (FAR_Z - 1))
    ctx.fillStyle = withAlpha(props.config.railColor, a)
    quad(ctx, [project(xr - RAIL_HW, 1, z), project(xr + RAIL_HW, 1, z), project(xr + RAIL_HW, 1, z2), project(xr - RAIL_HW, 1, z2)])
    ctx.fillStyle = withAlpha(head, a * 0.9)
    const hx = xr + (xr < 0 ? RAIL_HW * 0.15 : -RAIL_HW * 0.55)
    quad(ctx, [project(hx, 0.985, z), project(hx + RAIL_HW * 0.4, 0.985, z), project(hx + RAIL_HW * 0.4, 0.985, z2), project(hx, 0.985, z2)])
    z = z2
  }
}

function drawTrack(ctx: Ctx) {
  drawBallast(ctx)
  let z = 1.02
  let k = 0
  while (z < FAR_Z) {
    if (h01(k * 19) > 0.12) drawSleeper(ctx, z, k)
    z += 0.34 + h01(k * 23) * 0.06
    k++
  }
  drawRail(ctx, -RAIL_X)
  drawRail(ctx, RAIL_X)
}

function drawDepthFog(ctx: Ctx, w: number, h: number) {
  const v = project(0, 0.4, FAR_Z)
  const g = ctx.createRadialGradient(v[0], v[1], w * 0.02, v[0], v[1], w * 0.42)
  g.addColorStop(0, withAlpha(BLACK, 1))
  g.addColorStop(0.35, withAlpha(BLACK, 0.85))
  g.addColorStop(1, withAlpha(BLACK, 0))
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
}

function buildScene(ctx: Ctx, w: number, h: number) {
  return paintSceneLayer(ctx, (lctx) => {
    lctx.fillStyle = BLACK
    lctx.fillRect(0, 0, w, h)
    for (let z = 6; z >= 1; z -= 1) drawTimber(lctx, z)
    drawTrack(lctx)
    drawDepthFog(lctx, w, h)
  })
}

function stepPendulum(dt: number, t: number) {
  if (dt <= 0) return
  if (t >= nextGust) {
    omega += rand(0.5, 1.4) * (Math.random() < 0.5 ? -1 : 1)
    nextGust = t + rand(4, 11)
  }
  const wind = Math.sin(t * 0.7) * 0.15 + Math.sin(t * 2.3) * 0.05
  const alpha = -GRAV * Math.sin(theta) - DAMP * omega + wind
  omega += alpha * dt
  theta += omega * dt
}

function drawLanternLight(ctx: Ctx, w: number, h: number, lx: number, ly: number, glow: number) {
  const color = props.config.lanternColor
  const g = ctx.createRadialGradient(lx, ly, 2 * unit, lx, ly, w * 0.42)
  g.addColorStop(0, withAlpha(color, 0.5 * glow))
  g.addColorStop(0.25, withAlpha(darken(color, 0.15), 0.2 * glow))
  g.addColorStop(1, withAlpha(color, 0))
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
}

function drawChain(ctx: Ctx, px: number, py: number, angle: number) {
  const metal = darken(props.config.timberColor, 0.55)
  ctx.strokeStyle = metal
  ctx.lineWidth = Math.max(1, 0.8 * unit)
  const len = CHAIN * unit
  for (let i = 0; i < LINKS; i++) {
    const d = (i + 0.5) * (len / LINKS)
    ctx.save()
    ctx.translate(px + Math.sin(angle) * d, py + Math.cos(angle) * d)
    ctx.rotate(-angle + (i % 2) * Math.PI * 0.5)
    ctx.beginPath()
    ctx.ellipse(0, 0, 0.9 * unit, 2 * unit, 0, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()
  }
}

function drawFlame(ctx: Ctx, flick: number) {
  const fh = (3.2 + flick * 1.6) * unit
  ctx.fillStyle = withAlpha(lighten(props.config.lanternColor, 0.55), 0.95)
  ctx.beginPath()
  ctx.moveTo(0, -fh)
  ctx.quadraticCurveTo(1.6 * unit, -fh * 0.35, 0, unit * 0.8)
  ctx.quadraticCurveTo(-1.6 * unit, -fh * 0.35, 0, -fh)
  ctx.fill()
  ctx.fillStyle = withAlpha('#ffffff', 0.7)
  ctx.beginPath()
  ctx.ellipse(0, -fh * 0.15, 0.6 * unit, fh * 0.32, 0, 0, Math.PI * 2)
  ctx.fill()
}

function drawLanternBody(ctx: Ctx, angle: number, flick: number) {
  const metal = darken(props.config.timberColor, 0.4)
  const rim = lighten(metal, 0.35)
  ctx.rotate(-angle)
  ctx.fillStyle = metal
  ctx.fillRect(-1.2 * unit, -1.6 * unit, 2.4 * unit, 1.6 * unit)
  ctx.beginPath()
  ctx.moveTo(-3.2 * unit, 2.4 * unit)
  ctx.lineTo(3.2 * unit, 2.4 * unit)
  ctx.lineTo(4.4 * unit, 4.2 * unit)
  ctx.lineTo(-4.4 * unit, 4.2 * unit)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = withAlpha(props.config.lanternColor, 0.35 + flick * 0.25)
  ctx.fillRect(-3.4 * unit, 4.2 * unit, 6.8 * unit, 10 * unit)
  ctx.save()
  ctx.translate(0, 12.5 * unit)
  drawFlame(ctx, flick)
  ctx.restore()
  ctx.fillStyle = metal
  for (const bx of [-3.4, -0.35, 2.7]) ctx.fillRect(bx * unit, 4.2 * unit, 0.7 * unit, 10 * unit)
  ctx.fillRect(-4.4 * unit, 14.2 * unit, 8.8 * unit, 1.6 * unit)
  ctx.fillRect(-3 * unit, 15.8 * unit, 6 * unit, 0.8 * unit)
  ctx.fillStyle = rim
  ctx.fillRect(-4.4 * unit, 4.2 * unit, 8.8 * unit, 0.5 * unit)
  ctx.fillRect(-4.4 * unit, 14.2 * unit, 8.8 * unit, 0.4 * unit)
}

function drawLantern(ctx: Ctx, w: number, h: number, t: number) {
  const px = w * PIVOT_X
  const py = 0
  const len = CHAIN * unit
  const lx = px + Math.sin(theta) * len
  const ly = py + Math.cos(theta) * len
  const flick = flickerNoise(t, 1.3)
  const glow = 0.82 + flick * 0.25
  drawLanternLight(ctx, w, h, lx + Math.sin(theta) * 9 * unit, ly + Math.cos(theta) * 9 * unit, glow)
  drawChain(ctx, px, py, theta)
  ctx.save()
  ctx.translate(lx, ly)
  drawLanternBody(ctx, theta, flick)
  ctx.restore()
}

function drawDust(ctx: Ctx, w: number, h: number, t: number) {
  ctx.fillStyle = props.config.dustColor
  ctx.globalAlpha = 0.5
  for (const m of motes) {
    const y = (m.y + t * m.speed) % 1
    fillCircle(ctx, m.x * w, y * h, 0.8 * unit)
  }
  ctx.globalAlpha = 1
}

function drawDustFall(ctx: Ctx, w: number, t: number) {
  const dp = (t % 11) / 11
  if (dp >= 0.25) return
  const p = dp / 0.25
  ctx.fillStyle = props.config.dustColor
  ctx.globalAlpha = (1 - p) * 0.7
  for (let i = 0; i < 14; i++) {
    const x = w * 0.62 + (i - 7) * 4 * unit + Math.sin(i) * 3 * unit
    const y = 20 * unit + p * 150 * unit + i * 4 * unit
    fillCircle(ctx, x, y, (1.2 + (i % 3)) * unit)
  }
  ctx.globalAlpha = 1
}

function drawDarkWash(ctx: Ctx, w: number, h: number) {
  ctx.fillStyle = BLACK
  ctx.globalAlpha = 0.35
  ctx.fillRect(0, 0, w, h)
  ctx.globalAlpha = 1
}

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')

useBackdropCanvas(canvasRef, {
  init(w, h, now) {
    startTime = now
    lastNow = now
    initScene(w, h)
  },
  draw(ctx, w, h, now, reduced) {
    const t = reduced ? STATIC_T : (now - startTime) / 1000
    const dt = frameDelta(now, lastNow, reduced)
    lastNow = now
    if (!scene) scene = buildScene(ctx, w, h)
    blitSceneLayer(ctx, scene)
    if (reduced) theta = 0.2
    else stepPendulum(dt, t)
    drawLantern(ctx, w, h, t)
    if (props.config.dust) {
      drawDust(ctx, w, h, t)
      drawDustFall(ctx, w, t)
    }
    drawDarkWash(ctx, w, h)
  },
})
</script>

<template>
  <canvas
    ref="canvas"
    class="mineshaft-backdrop"
    :style="{ opacity: config.opacity }"
    aria-hidden="true"
  />
</template>

<style scoped>
.mineshaft-backdrop {
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
