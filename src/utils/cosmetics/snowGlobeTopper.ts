import type { BorderSnowGlobeOverlaySpec, StarshineFill, StarshineGlint } from '@/types/cosmetics/border'
import { darken } from '@/utils/color'
import { lazyPath, sparkle, type Ctx } from '@/utils/cosmetics/canvasShapes'
import type { GlobePoint } from '@/utils/cosmetics/snowGlobeKit'
import { drawGlint, glitterLevel } from '@/utils/cosmetics/starshine'
import { hash01 } from '@/utils/random'

type StarSpec = NonNullable<BorderSnowGlobeOverlaySpec['star']>

const COLLAR = lazyPath('M24,85 H76 Q78,85 78,87 V91 H22 V87 Q22,85 24,85 Z')
const PLINTH = lazyPath('M16,91 H84 L90,109 Q90,111 88,111 H12 Q10,111 10,109 Z')
const TOPPER = { x: 50, y: -2, r: 12, specks: 22, gleamS: 7, gleamWidth: 0.1 }
const POPS = [[33, -8], [67, -10], [38, 8], [63, 7]]
const GRAIN_ROWS = [94, 97.4, 100.6, 103.2]

function topperPoint(u: number): GlobePoint {
  const f = (((u % 1) + 1) % 1) * 10
  const i = Math.floor(f)
  const corner = (k: number): GlobePoint => {
    const a = -Math.PI / 2 + (k * Math.PI) / 5
    const r = k % 2 ? TOPPER.r * 0.42 : TOPPER.r
    return { x: TOPPER.x + Math.cos(a) * r, y: TOPPER.y + Math.sin(a) * r }
  }
  const a = corner(i)
  const b = corner(i + 1)
  return { x: a.x + (b.x - a.x) * (f - i), y: a.y + (b.y - a.y) * (f - i) }
}

function drawGlitter(ctx: Ctx, fill: StarshineFill, shape: StarshineGlint, clock: number): void {
  const gleam = (clock / TOPPER.gleamS) % 1
  ctx.fillStyle = fill.glint
  ctx.strokeStyle = fill.glint
  for (let i = 0; i < TOPPER.specks; i++) {
    const u = hash01(i * 7.3 + 2)
    const { lit, twinkle, alpha } = glitterLevel(clock, 1.4 + hash01(i) * 2.2, i * 1.9, Math.abs(u - gleam), TOPPER.gleamWidth)
    const p = topperPoint(u)
    ctx.globalAlpha = alpha
    sparkle(ctx, p.x, p.y, 0.6 + (twinkle + lit) * 1.1)
  }
  POPS.forEach(([x, y], i) => {
    const swell = Math.max(0, Math.sin(clock * 1.1 + i * 1.7)) ** 3
    ctx.globalAlpha = swell
    drawGlint(ctx, shape, x, y, 3.6 * swell, clock * 0.2)
  })
  ctx.globalAlpha = 1
}

export function drawTopper(ctx: Ctx, fill: StarshineFill, clock: number): void {
  const shape = fill.glintShape ?? 'star'
  ctx.fillStyle = fill.light
  ctx.strokeStyle = fill.light
  if (shape === 'snowflake') {
    drawGlint(ctx, shape, TOPPER.x, TOPPER.y, TOPPER.r, 0)
  } else {
    ctx.beginPath()
    for (let i = 0; i < 10; i++) {
      const p = topperPoint(i / 10)
      ctx.lineTo(p.x, p.y)
    }
    ctx.closePath()
    ctx.fill()
  }
  drawGlitter(ctx, fill, shape, clock)
}

function drawPlaque(ctx: Ctx, trim: string): void {
  ctx.fillStyle = trim
  ctx.fillRect(41, 95, 18, 6.5)
  ctx.strokeStyle = darken(trim, 0.4)
  ctx.lineWidth = 0.4
  ctx.strokeRect(41, 95, 18, 6.5)
  ctx.lineWidth = 0.5
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(44, 97.4)
  ctx.lineTo(56, 97.4)
  ctx.moveTo(45.5, 99.4)
  ctx.lineTo(54.5, 99.4)
  ctx.stroke()
}

export function drawWoodBase(ctx: Ctx, star: StarSpec): void {
  ctx.fillStyle = star.wood
  ctx.fill(PLINTH())
  ctx.save()
  ctx.clip(PLINTH())
  ctx.strokeStyle = star.grain
  ctx.lineWidth = 0.45
  for (const y of GRAIN_ROWS) {
    ctx.beginPath()
    for (let x = 8; x <= 92; x += 4) ctx.lineTo(x, y + Math.sin(x * 0.21 + y) * 0.7)
    ctx.stroke()
  }
  ctx.fillStyle = star.grain
  ctx.fillRect(0, 105, 100, 6)
  ctx.restore()
  drawPlaque(ctx, star.trim)
  ctx.fillStyle = star.holder
  ctx.fill(COLLAR())
  ctx.fillStyle = star.trim
  ctx.fillRect(22, 87, 56, 1.4)
}
