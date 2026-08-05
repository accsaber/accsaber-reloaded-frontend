<script setup lang="ts">
import { useBackdropCanvas } from '@/composables/useBackdropCanvas'
import { darken, lighten } from '@/utils/color'
import { cell, drawDitheredBands } from '@/utils/pixelScene'
import { randBetween as rand } from '@/utils/random'
import { blitSceneLayer, createSceneLayer } from '@/utils/sceneLayer'
import type { PixelFieldBackdropConfig } from '@/utils/themeBackdrop'
import { useTemplateRef } from 'vue'

const props = defineProps<{
  config: PixelFieldBackdropConfig
}>()

interface Stalk {
  col: number
  tipRow: number
  color: string
  headColor: string
  underColor: string
  phase: number
  amp: number
}

interface Leaf {
  x: number
  y0: number
  bornAt: number
  speed: number
  bobPhase: number
  color: string
}

interface Bird {
  x0: number
  y0: number
  dir: number
  speed: number
  bornAt: number
  flapPhase: number
}

const TIP_DEPTH = 3
const SUN_RADIUS = 9
const RAYS = [
  { dy: 0, len: 24, density: 10 },
  { dy: -2, len: 16, density: 8 },
  { dy: -5, len: 10, density: 6 },
  { dy: -8, len: 6, density: 5 },
]

let stalkLayers: Stalk[][] = []
let leaves: Leaf[] = []
let birds: Bird[] = []
let nextLeafAt = 0
let nextFlockAt = 0
let startTime = 0
let cols = 0
let rows = 0
let horizonRow = 0
let sunCol = 0
let sunCore = ''
let sunMid = ''
let sunGlow = ''
let bg: HTMLCanvasElement | null = null

function initField(w: number, h: number) {
  const ps = props.config.pixelSize
  cols = Math.ceil(w / ps)
  rows = Math.ceil(h / ps)
  horizonRow = Math.floor(rows * (1 - props.config.fieldHeightPct / 100))
  sunCol = Math.floor(cols * 0.72)
  sunCore = lighten(props.config.sunColor, 0.55)
  sunMid = lighten(props.config.sunColor, 0.28)
  sunGlow = lighten(props.config.sunColor, 0.18)
  bg = null

  stalkLayers = []
  const wheat = props.config.wheatColors
  const layerCount = props.config.fieldRows
  const layerH = (rows - horizonRow) / layerCount
  for (let layer = 0; layer < layerCount; layer++) {
    const boundary = horizonRow + 1 + Math.round(layer * layerH)
    const back = layerCount - 1 - layer
    const layerStalks: Stalk[] = []
    for (let col = 0; col < cols; col++) {
      const base = wheat[Math.floor(Math.random() * wheat.length)]
      const color = back === 0 ? base : darken(base, 0.18 * back)
      layerStalks.push({
        col,
        tipRow: boundary + Math.floor(rand(0, 3)),
        color,
        headColor: back === 0 ? lighten(color, 0.18) : color,
        underColor: darken(color, 0.14),
        phase: col * 0.22 + layer * 1.7 + rand(-0.15, 0.15),
        amp: 1 + layer * 0.25,
      })
    }
    stalkLayers.push(layerStalks)
  }

  leaves = []
  birds = []
}

function spawnLeaf(now: number, h: number) {
  const colors = props.config.leafColors
  leaves.push({
    x: -20,
    y0: rand(h * 0.1, h * 0.65),
    bornAt: now,
    speed: rand(35, 65) * props.config.windSpeed,
    bobPhase: rand(0, Math.PI * 2),
    color: colors[Math.floor(Math.random() * colors.length)],
  })
}

function spawnFlock(now: number, w: number, h: number) {
  const dir = Math.random() < 0.5 ? 1 : -1
  const count = Math.round(rand(2, 4))
  const speed = rand(90, 130)
  const y = rand(h * 0.08, h * 0.4)
  for (let i = 0; i < count; i++) {
    birds.push({
      x0: dir === 1 ? -30 - i * rand(18, 34) : w + 30 + i * rand(18, 34),
      y0: y + rand(-14, 14),
      dir,
      speed,
      bornAt: now,
      flapPhase: rand(0, Math.PI * 2),
    })
  }
}

function drawSunDisc(ctx: CanvasRenderingContext2D, ps: number) {
  for (let dy = -SUN_RADIUS; dy <= 4; dy++) {
    for (let dx = -SUN_RADIUS; dx <= SUN_RADIUS; dx++) {
      const d2 = dx * dx + dy * dy
      if (d2 > SUN_RADIUS * SUN_RADIUS) continue
      const row = horizonRow + dy
      if (row < 0 || row >= horizonRow + 5) continue
      cell(
        ctx,
        sunCol + dx,
        row,
        ps,
        d2 <= 16 ? sunCore : d2 <= 42 ? sunMid : props.config.sunColor,
      )
    }
  }
}

function drawSunHaze(ctx: CanvasRenderingContext2D, ps: number, shimmer: number) {
  ctx.fillStyle = sunGlow
  for (let dy = -17; dy <= 0; dy++) {
    const row = horizonRow + dy
    if (row < 0 || row >= horizonRow) continue
    for (let dx = -17; dx <= 17; dx++) {
      const d2 = dx * dx + dy * dy
      if (d2 <= SUN_RADIUS * SUN_RADIUS) continue
      const density = d2 <= 144 ? 8 : d2 <= 289 ? 4 : 0
      if (!density) continue
      const hash = (((dx * dx * 3 + dy * dy * 7 + dx * dy * 5 + shimmer * 3) % 19) + 19) % 19
      if (hash < density) ctx.fillRect((sunCol + dx) * ps, row * ps, ps, ps)
    }
  }

  for (const ray of RAYS) {
    const row = horizonRow + ray.dy
    if (row < 0) continue
    for (let dx = SUN_RADIUS + 1; dx <= SUN_RADIUS + ray.len; dx++) {
      const fadeD = ray.density - Math.floor(((dx - SUN_RADIUS) / ray.len) * 3)
      if ((dx * 7 + ray.dy * 13 + shimmer * 5 + 100) % 17 < fadeD) {
        ctx.fillRect((sunCol + dx) * ps, row * ps, ps, ps)
      }
      if ((dx * 11 + ray.dy * 5 + shimmer * 7 + 100) % 17 < fadeD) {
        ctx.fillRect((sunCol - dx) * ps, row * ps, ps, ps)
      }
    }
  }
}

function drawSunReflection(ctx: CanvasRenderingContext2D, ps: number, shimmer: number) {
  ctx.fillStyle = sunMid
  for (let dy = 1; dy <= 4; dy++) {
    const row = horizonRow + dy
    if (row >= rows) continue
    for (let dx = -14; dx <= 14; dx++) {
      const density = (5 - dy) * 2 - Math.floor(Math.abs(dx) / 5)
      if (density > 0 && (dx * 7 + dy * 13 + shimmer * 5 + 200) % 19 < density) {
        ctx.fillRect((sunCol + dx) * ps, row * ps, ps, ps)
      }
    }
  }
}

function drawStalkBodies(ctx: CanvasRenderingContext2D, ps: number) {
  for (const layerStalks of stalkLayers) {
    for (const s of layerStalks) {
      const solidTop = s.tipRow + TIP_DEPTH
      ctx.fillStyle = s.underColor
      for (let row = s.tipRow + 1; row < solidTop && row < rows; row++) {
        ctx.fillRect(s.col * ps, row * ps, ps, ps)
      }
      ctx.fillStyle = s.color
      for (let row = solidTop; row < rows; row++) {
        ctx.fillRect(s.col * ps, row * ps, ps, ps)
      }
    }
  }
}

function drawStalkTips(ctx: CanvasRenderingContext2D, ps: number, windT: number) {
  for (const layerStalks of stalkLayers) {
    for (const s of layerStalks) {
      const solidTop = s.tipRow + TIP_DEPTH
      const bend = Math.round(Math.sin(windT + s.phase) * s.amp)
      if (s.tipRow >= rows) continue
      const x = (s.col + bend) * ps
      ctx.fillStyle = s.headColor
      ctx.fillRect(x, s.tipRow * ps, ps, ps)
      ctx.fillStyle = s.color
      for (let row = s.tipRow + 1; row < solidTop && row < rows; row++) {
        ctx.fillRect(x, row * ps, ps, ps)
      }
    }
  }
}

function buildBackground(ctx: CanvasRenderingContext2D): HTMLCanvasElement {
  const ps = props.config.pixelSize
  const layer = createSceneLayer(ctx)
  const lctx = layer.getContext('2d')
  if (!lctx) return layer
  drawDitheredBands(lctx, cols, ps, props.config.skyColors, 0, horizonRow)
  drawSunDisc(lctx, ps)
  drawStalkBodies(lctx, ps)
  return layer
}

function drawLeaves(ctx: CanvasRenderingContext2D, w: number, now: number, elapsed: number) {
  const ps = props.config.pixelSize
  leaves = leaves.filter((l) => l.x + ((now - l.bornAt) / 1000) * l.speed < w + 40)
  for (const l of leaves) {
    const t = (now - l.bornAt) / 1000
    const x = l.x + t * l.speed
    const y = l.y0 + Math.sin(elapsed * 2 + l.bobPhase) * 9 + t * 6
    const col = Math.round(x / ps)
    const row = Math.round(y / ps)
    ctx.fillStyle = l.color
    ctx.fillRect(col * ps, row * ps, ps, ps)
    ctx.fillRect((col + 1) * ps, row * ps, ps, ps)
    ctx.fillRect((col + 1) * ps, (row - 1) * ps, ps, ps)
  }
}

function drawBirds(ctx: CanvasRenderingContext2D, w: number, now: number, elapsed: number) {
  const ps = Math.max(3, props.config.pixelSize - 2)
  birds = birds.filter((b) => {
    const x = b.x0 + b.dir * ((now - b.bornAt) / 1000) * b.speed
    return x > -60 && x < w + 60
  })
  ctx.fillStyle = props.config.birdColor
  for (const b of birds) {
    const t = (now - b.bornAt) / 1000
    const x = b.x0 + b.dir * t * b.speed
    const y = b.y0 + Math.sin(elapsed * 1.2 + b.flapPhase) * 5
    const col = Math.round(x / ps)
    const row = Math.round(y / ps)
    const wingsUp = Math.sin(elapsed * 9 + b.flapPhase) > 0
    ctx.fillRect(col * ps, row * ps, ps, ps)
    if (wingsUp) {
      ctx.fillRect((col - 1) * ps, (row - 1) * ps, ps, ps)
      ctx.fillRect((col + 1) * ps, (row - 1) * ps, ps, ps)
    } else {
      ctx.fillRect((col - 1) * ps, row * ps, ps, ps)
      ctx.fillRect((col + 1) * ps, row * ps, ps, ps)
    }
  }
}

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')

useBackdropCanvas(canvasRef, {
  init(w, h, now) {
    startTime = now
    nextLeafAt = now + rand(500, 2000)
    nextFlockAt = now + rand(3000, 10000)
    initField(w, h)
  },
  draw(ctx, w, h, now, reduced) {
    const ps = props.config.pixelSize
    if (!bg) bg = buildBackground(ctx)
    blitSceneLayer(ctx, bg)

    const elapsed = (now - startTime) / 1000
    const shimmer = reduced ? 0 : Math.floor(elapsed * 1.25) % 2
    drawSunHaze(ctx, ps, shimmer)
    drawStalkTips(ctx, ps, reduced ? 0 : elapsed * 1.6 * props.config.windSpeed)
    drawSunReflection(ctx, ps, shimmer)

    if (reduced) return
    if (props.config.leaves) {
      if (now >= nextLeafAt) {
        spawnLeaf(now, h)
        nextLeafAt = now + rand(1200, 3500) / props.config.windSpeed
      }
      drawLeaves(ctx, w, now, elapsed)
    }
    if (props.config.birds) {
      if (now >= nextFlockAt) {
        spawnFlock(now, w, h)
        nextFlockAt = now + rand(10000, 25000)
      }
      drawBirds(ctx, w, now, elapsed)
    }
  },
})
</script>

<template>
  <canvas
    ref="canvas"
    class="pixel-field-backdrop"
    :style="{ opacity: config.opacity }"
    aria-hidden="true"
  />
</template>

<style scoped>
.pixel-field-backdrop {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: -1;
  pointer-events: none;
}
</style>
