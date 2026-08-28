<script setup lang="ts">
import { useBackdropCanvas } from '@/composables/useCanvasScene'
import { parseHex, type RGB } from '@/utils/color'
import { randBetween as rand } from '@/utils/random'
import {
  blitSceneLayer,
  clearSceneLayer,
  createRadialSprite,
  createSceneLayer,
} from '@/utils/cosmetics/sceneLayer'
import type { StarfieldBackdropConfig } from '@/utils/cosmetics/themeBackdrop'
import { useTemplateRef } from 'vue'

const props = defineProps<{
  config: StarfieldBackdropConfig
}>()

interface StarSprite {
  canvas: HTMLCanvasElement
  drawSize: number
  half: number
}

interface Star {
  x: number
  y: number
  sprite: StarSprite
  baseOpacity: number
  twinkleSpeed: number
  twinklePhase: number
  twinkleDepth: number
}

interface Streak {
  x: number
  y: number
  dx: number
  dy: number
  bornAt: number
  lifeMs: number
}

interface Nebula {
  x: number
  y: number
  radius: number
  sprite: HTMLCanvasElement
  breatheSpeed: number
  breathePhase: number
}

const FALLBACK_STAR: RGB = [219, 228, 255]
const SPRITE_PAD = 1
const NEBULA_SPRITE_PX = 512
const NEBULA_ALPHA_STEP = 0.015
const MIN_VISIBLE_ALPHA = 0.02

let stars: Star[] = []
let nebulas: Nebula[] = []
let nebulaLayer: HTMLCanvasElement | null = null
let nebulaAlphas: number[] = []
let shootingStars: Streak[] = []
let comets: Streak[] = []
let nextShootingAt = 0
let nextCometAt = 0
let startTime = 0
let starRgb: RGB = FALLBACK_STAR
let deviceScale = 1

function makeStarSprite(size: number): StarSprite {
  const px = Math.max(2, Math.ceil((size + SPRITE_PAD * 2) * deviceScale))
  const canvas = document.createElement('canvas')
  canvas.width = px
  canvas.height = px
  const ctx = canvas.getContext('2d')
  if (ctx) {
    const center = px / 2
    ctx.beginPath()
    ctx.arc(center, center, (size * deviceScale) / 2, 0, Math.PI * 2)
    ctx.fillStyle = `rgb(${starRgb[0]}, ${starRgb[1]}, ${starRgb[2]})`
    ctx.fill()
  }
  const drawSize = px / deviceScale
  return { canvas, drawSize, half: drawSize / 2 }
}

function makeNebulaSprite(color: RGB, alpha: number): HTMLCanvasElement {
  return createRadialSprite(NEBULA_SPRITE_PX, color, [
    [0, alpha],
    [0.6, alpha * 0.4],
    [1, 0],
  ])
}

function initStars(w: number, h: number) {
  const count = Math.max(80, Math.min(380, Math.round(((w * h) / 9000) * props.config.starDensity)))
  const sprites = new Map<number, StarSprite>()
  stars = []
  for (let i = 0; i < count; i++) {
    const bright = Math.random() < 0.22
    const size = Math.round((bright ? rand(1.4, 2.2) : rand(0.6, 1.3)) * 5) / 5
    let sprite = sprites.get(size)
    if (!sprite) {
      sprite = makeStarSprite(size)
      sprites.set(size, sprite)
    }
    stars.push({
      x: Math.random() * w,
      y: Math.random() * h,
      sprite,
      baseOpacity: bright ? rand(0.55, 0.9) : rand(0.18, 0.45),
      twinkleSpeed: rand(0.3, 1.6),
      twinklePhase: rand(0, Math.PI * 2),
      twinkleDepth: bright ? rand(0.5, 0.8) : rand(0.25, 0.55),
    })
  }
}

function initNebulas(w: number, h: number) {
  nebulas = []
  nebulaAlphas = []
  nebulaLayer = null
  if (!props.config.nebulas) return
  const colors = props.config.nebulaColors
  const count = Math.max(1, Math.round(props.config.nebulaCount))
  const cols = Math.ceil(Math.sqrt(count))
  const rows = Math.ceil(count / cols)
  const baseRadius = Math.min(w, h) * 0.32 * props.config.nebulaSize
  const sprites = new Map<string, HTMLCanvasElement>()
  for (let i = 0; i < count; i++) {
    const col = i % cols
    const row = Math.floor(i / cols)
    const hex = colors[i % colors.length]
    let sprite = sprites.get(hex)
    if (!sprite) {
      sprite = makeNebulaSprite(parseHex(hex) ?? FALLBACK_STAR, props.config.nebulaOpacity)
      sprites.set(hex, sprite)
    }
    nebulas.push({
      x: ((col + rand(0.25, 0.75)) * w) / cols,
      y: ((row + rand(0.25, 0.75)) * h) / rows,
      radius: baseRadius * rand(0.7, 1.3),
      sprite,
      breatheSpeed: rand(0.05, 0.12),
      breathePhase: rand(0, Math.PI * 2),
    })
  }
}

function spawnShootingStar(now: number, w: number, h: number) {
  const angle = rand(25, 40) * (Math.PI / 180)
  const dir = Math.random() < 0.5 ? 1 : -1
  const speed = rand(500, 800)
  shootingStars.push({
    x: rand(dir === 1 ? 0 : w * 0.3, dir === 1 ? w * 0.7 : w),
    y: rand(0, h * 0.55),
    dx: Math.cos(angle) * speed * dir,
    dy: Math.sin(angle) * speed,
    bornAt: now,
    lifeMs: rand(500, 900),
  })
}

function spawnComet(now: number, w: number, h: number) {
  const angle = rand(8, 20) * (Math.PI / 180)
  const dir = Math.random() < 0.5 ? 1 : -1
  const lifeMs = rand(9000, 14000)
  const speed = (w + 240) / (lifeMs / 1000)
  comets.push({
    x: dir === 1 ? -60 : w + 60,
    y: rand(h * 0.05, h * 0.5),
    dx: Math.cos(angle) * speed * dir,
    dy: Math.sin(angle) * speed,
    bornAt: now,
    lifeMs,
  })
}

function streakFade(p: number, attack: number, release: number): number {
  return Math.min(1, p / attack, (1 - p) / release)
}

function paintNebulaLayer(ctx: CanvasRenderingContext2D) {
  if (!nebulaLayer) nebulaLayer = createSceneLayer(ctx)
  const lctx = nebulaLayer.getContext('2d')
  if (!lctx) return
  clearSceneLayer(nebulaLayer)
  for (let i = 0; i < nebulas.length; i++) {
    const n = nebulas[i]
    lctx.globalAlpha = nebulaAlphas[i]
    lctx.drawImage(n.sprite, n.x - n.radius, n.y - n.radius, n.radius * 2, n.radius * 2)
  }
  lctx.globalAlpha = 1
}

function syncNebulaLayer(ctx: CanvasRenderingContext2D, elapsed: number, reduced: boolean) {
  let dirty = !nebulaLayer
  for (let i = 0; i < nebulas.length; i++) {
    const n = nebulas[i]
    const alpha = reduced ? 1 : 0.8 + 0.2 * Math.sin(elapsed * n.breatheSpeed + n.breathePhase)
    if (Math.abs(alpha - (nebulaAlphas[i] ?? -1)) > NEBULA_ALPHA_STEP) {
      nebulaAlphas[i] = alpha
      dirty = true
    }
  }
  if (dirty) paintNebulaLayer(ctx)
}

function drawStars(ctx: CanvasRenderingContext2D, elapsed: number, reduced: boolean) {
  for (const s of stars) {
    let opacity = s.baseOpacity
    if (!reduced) {
      const wave = Math.sin(elapsed * s.twinkleSpeed + s.twinklePhase)
      opacity *= 1 - s.twinkleDepth * 0.5 * (1 - wave)
    }
    if (opacity < MIN_VISIBLE_ALPHA) continue
    const sprite = s.sprite
    ctx.globalAlpha = opacity
    ctx.drawImage(
      sprite.canvas,
      s.x - sprite.half,
      s.y - sprite.half,
      sprite.drawSize,
      sprite.drawSize,
    )
  }
  ctx.globalAlpha = 1
}

function drawStreak(
  ctx: CanvasRenderingContext2D,
  st: Streak,
  now: number,
  trail: number,
  width: number,
  attack: number,
  release: number,
  halo: number,
) {
  const p = (now - st.bornAt) / st.lifeMs
  const t = (now - st.bornAt) / 1000
  const hx = st.x + st.dx * t
  const hy = st.y + st.dy * t
  const norm = Math.hypot(st.dx, st.dy)
  const tx = hx - (st.dx / norm) * trail
  const ty = hy - (st.dy / norm) * trail
  const fade = streakFade(p, attack, release)
  const [r, g, b] = starRgb

  const grad = ctx.createLinearGradient(hx, hy, tx, ty)
  grad.addColorStop(0, `rgba(255, 255, 255, ${0.9 * fade})`)
  grad.addColorStop(0.3, `rgba(${r}, ${g}, ${b}, ${0.45 * fade})`)
  grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`)
  ctx.strokeStyle = grad
  ctx.lineWidth = width
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(hx, hy)
  ctx.lineTo(tx, ty)
  ctx.stroke()

  if (halo > 0) {
    const haloGrad = ctx.createRadialGradient(hx, hy, 0, hx, hy, halo)
    haloGrad.addColorStop(0, `rgba(255, 255, 255, ${0.5 * fade})`)
    haloGrad.addColorStop(0.4, `rgba(${r}, ${g}, ${b}, ${0.25 * fade})`)
    haloGrad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`)
    ctx.beginPath()
    ctx.arc(hx, hy, halo, 0, Math.PI * 2)
    ctx.fillStyle = haloGrad
    ctx.fill()
  }

  ctx.beginPath()
  ctx.arc(hx, hy, width * 0.7, 0, Math.PI * 2)
  ctx.fillStyle = `rgba(255, 255, 255, ${fade})`
  ctx.fill()
}

function drawStreaks(ctx: CanvasRenderingContext2D, w: number, h: number, now: number) {
  if (props.config.comets) {
    if (now >= nextCometAt) {
      spawnComet(now, w, h)
      nextCometAt = now + rand(props.config.cometMinMs, props.config.cometMaxMs)
    }
    comets = comets.filter((c) => now - c.bornAt < c.lifeMs)
    for (const c of comets) {
      drawStreak(ctx, c, now, 200, 2.2, 0.1, 0.15, 7)
    }
  }

  if (props.config.shooting) {
    if (now >= nextShootingAt) {
      spawnShootingStar(now, w, h)
      nextShootingAt = now + rand(props.config.shootingMinMs, props.config.shootingMaxMs)
    }
    shootingStars = shootingStars.filter((st) => now - st.bornAt < st.lifeMs)
    for (const st of shootingStars) {
      drawStreak(ctx, st, now, 90, 1.4, 0.08, 0.35, 0)
    }
  }
}

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')

useBackdropCanvas(canvasRef, {
  init(w, h, now, scale) {
    startTime = now
    deviceScale = scale
    starRgb = parseHex(props.config.starColor) ?? FALLBACK_STAR
    nextShootingAt = now + rand(1000, 3500)
    nextCometAt = now + rand(4000, props.config.cometMaxMs)
    shootingStars = []
    comets = []
    initStars(w, h)
    initNebulas(w, h)
  },
  draw(ctx, w, h, now, reduced) {
    const elapsed = (now - startTime) / 1000
    if (nebulas.length) {
      syncNebulaLayer(ctx, elapsed, reduced)
      if (nebulaLayer) blitSceneLayer(ctx, nebulaLayer)
    } else {
      ctx.clearRect(0, 0, w, h)
    }
    drawStars(ctx, elapsed, reduced)
    if (!reduced) drawStreaks(ctx, w, h, now)
  },
})
</script>

<template>
  <canvas
    ref="canvas"
    class="starfield-backdrop"
    :style="{ opacity: config.opacity }"
    aria-hidden="true"
  />
</template>

<style scoped>
.starfield-backdrop {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: -1;
  pointer-events: none;
}
</style>
