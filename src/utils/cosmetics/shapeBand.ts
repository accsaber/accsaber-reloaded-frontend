import { AVATAR_STACK_SCALE } from '@/utils/avatarBox'
import { loopPoint, traceBox, traceShape, type ShapeTrace, type TraceBox, type TraceLoop } from '@/utils/cosmetics/shapeTrace'

export interface BandSpot {
  x: number
  y: number
  nx: number
  ny: number
  thick: number
}

export interface ShapeBand {
  vb: TraceBox
  length: number
  at: (u: number) => BandSpot | null
}

type Solid = (x: number, y: number) => boolean

const MAP_PX = 240
const PROBE = { from: -2, to: 16, step: 0.25 }
const OPEN_BAND = 7
const RAW = { x: 0, y: 0, w: 1, h: 1 }
const cache = new Map<string, ShapeBand | null>()

function materialMap(trace: ShapeTrace, vb: TraceBox): Solid | null {
  const canvas = document.createElement('canvas')
  canvas.width = MAP_PX
  canvas.height = MAP_PX
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null
  ctx.setTransform(MAP_PX / vb.w, 0, 0, MAP_PX / vb.h, (-vb.x * MAP_PX) / vb.w, (-vb.y * MAP_PX) / vb.h)
  for (const d of trace.ds) ctx.fill(new Path2D(d))
  if (trace.hole) {
    ctx.globalCompositeOperation = 'destination-out'
    ctx.translate(50, 50)
    ctx.scale(AVATAR_STACK_SCALE, AVATAR_STACK_SCALE)
    ctx.translate(-50, -50)
    ctx.fill(new Path2D(trace.hole))
  }
  const rgba = ctx.getImageData(0, 0, MAP_PX, MAP_PX).data
  const alpha = new Uint8Array(MAP_PX * MAP_PX)
  for (let i = 0; i < alpha.length; i++) alpha[i] = rgba[i * 4 + 3]
  return (x, y) => {
    const px = Math.floor(((x - vb.x) / vb.w) * MAP_PX)
    const py = Math.floor(((y - vb.y) / vb.h) * MAP_PX)
    return px >= 0 && py >= 0 && px < MAP_PX && py < MAP_PX && alpha[py * MAP_PX + px] > 127
  }
}

function probe(solid: Solid, x: number, y: number, nx: number, ny: number): { mid: number; thick: number } | null {
  let enter = NaN
  for (let d = PROBE.from; d <= PROBE.to; d += PROBE.step) {
    const inside = solid(x + nx * d, y + ny * d)
    if (inside && Number.isNaN(enter)) enter = d
    else if (!inside && !Number.isNaN(enter)) return { mid: (enter + d) / 2, thick: d - enter }
  }
  return Number.isNaN(enter) ? null : { mid: enter + OPEN_BAND / 2, thick: OPEN_BAND }
}

function spotAt(lp: TraceLoop, solid: Solid, vb: TraceBox, u: number): BandSpot | null {
  const p = loopPoint(lp, u, RAW, 1, 1)
  const a = loopPoint(lp, u - 0.004, RAW, 1, 1)
  const b = loopPoint(lp, u + 0.004, RAW, 1, 1)
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1
  const inward = -(b.y - a.y) * (vb.x + vb.w / 2 - p.x) + (b.x - a.x) * (vb.y + vb.h / 2 - p.y) < 0 ? -1 : 1
  const nx = (-(b.y - a.y) / len) * inward
  const ny = ((b.x - a.x) / len) * inward
  const hit = probe(solid, p.x, p.y, nx, ny)
  return hit && { x: p.x + nx * hit.mid, y: p.y + ny * hit.mid, nx, ny, thick: hit.thick }
}

export function shapeBand(trace: ShapeTrace | null | undefined): ShapeBand | null {
  if (!trace?.wall || typeof document === 'undefined') return null
  const key = `${trace.viewBox}|${trace.wall}|${trace.hole ?? ''}|${trace.ds.join('|')}`
  const known = cache.get(key)
  if (known !== undefined) return known
  const vb = traceBox(trace.viewBox)
  const lp = traceShape({ ds: [trace.wall], viewBox: trace.viewBox }).loops[0]
  const solid = materialMap(trace, vb)
  const band = lp && solid ? { vb, length: lp.len, at: (u: number) => spotAt(lp, solid, vb, u) } : null
  cache.set(key, band)
  return band
}

export function bandToCanvas(band: ShapeBand, spot: { x: number; y: number }, w: number, h: number): { x: number; y: number } {
  return { x: ((spot.x - band.vb.x) / band.vb.w) * w, y: ((spot.y - band.vb.y) / band.vb.h) * h }
}
