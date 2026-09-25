import type { Composition, ItemTypeKey } from '@/types/api/items'
import { hash01 } from '@/utils/random'
import type { ShapeRing } from '@/utils/shapeSilhouette'

export interface OverlayBox {
  w: number
  h: number
}

export interface ContentBox {
  x: number
  y: number
  w: number
  h: number
}

export interface EffectHostContext {
  base?: 'light' | 'dark'
  ring?: ShapeRing | null
  fillType?: string
  overlayType?: string
  auraType?: string
  sceneType?: string
  backdropType?: string
  viewport?: boolean
}

export interface EffectMeasure {
  overlayBox: OverlayBox
  box: ContentBox
  stack: number
  typeKey?: ItemTypeKey
  host?: EffectHostContext
  frame?: ContentBox
}

export function asString(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined
}

export function asNumber(v: unknown): number | undefined {
  return typeof v === 'number' ? v : undefined
}

export function asColor(v: unknown): string {
  return typeof v === 'string' ? v : 'transparent'
}

export function clampNumber(v: unknown, lo: number, hi: number, fallback: number): number {
  return Math.max(lo, Math.min(hi, asNumber(v) ?? fallback))
}

export function boxScale(minD: number, min = 0.7): number {
  return Math.max(min, Math.min(1.8, minD / 140))
}

export function isFieldKey(typeKey: ItemTypeKey | undefined): boolean {
  return typeKey === 'theme' || typeKey === 'profile_thumbnail_background'
}

export interface PctSizing {
  pct: number
  minPx: number
  maxPx: number
}

export function readPctSizing(
  c: Composition,
  pctKey: 'sizePct' | 'lengthPct',
  pct: [number, number, number],
  minPx: [number, number],
  maxPx: [number, number],
): PctSizing {
  return {
    pct: clampNumber(c[pctKey], pct[0], pct[2], pct[1]),
    minPx: Math.max(minPx[0], asNumber(c.minPx) ?? minPx[1]),
    maxPx: Math.max(maxPx[0], asNumber(c.maxPx) ?? maxPx[1]),
  }
}

export function pctSize(minD: number, s: PctSizing, scale = 1): number {
  return Math.max(s.minPx, Math.min(s.maxPx, ((s.pct * scale) / 100) * minD))
}

export function hostMatches(
  condition: unknown,
  host: EffectHostContext | undefined,
): boolean {
  if (!condition || typeof condition !== 'object' || !host) return false
  const entries = Object.entries(condition as Record<string, unknown>)
  if (entries.length === 0) return false
  return entries.every(([key, value]) => host[key as keyof EffectHostContext] === value)
}

export interface Vec {
  x: number
  y: number
}

export interface RingSample {
  p: Vec
  n: Vec
  t: Vec
}

export interface RingPoly {
  pts: Vec[]
  cum: number[]
  total: number
  clockwise: boolean
  facing: number[] | null
}

export interface RingGeometry {
  outer: RingPoly
  band: RingPoly
  inner: RingPoly
}

export function ringPathD(poly: RingPoly): string {
  return poly.pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + ' Z'
}

function polyOf(pts: Vec[], avatar: Vec[] | null = null): RingPoly {
  const cum: number[] = [0]
  for (let i = 1; i <= pts.length; i++) {
    const a = pts[i - 1]
    const b = pts[i % pts.length]
    cum.push((cum[i - 1] ?? 0) + (a && b ? Math.hypot(b.x - a.x, b.y - a.y) : 0))
  }
  const clockwise = signedArea(pts) > 0
  return { pts, cum, total: cum[pts.length] ?? 0, clockwise, facing: avatar ? segmentFacing(pts, clockwise, avatar) : null }
}

function centroid(pts: Vec[]): Vec {
  let x = 0
  let y = 0
  for (const q of pts) {
    x += q.x
    y += q.y
  }
  return { x: x / (pts.length || 1), y: y / (pts.length || 1) }
}

function segmentFacing(pts: Vec[], clockwise: boolean, avatar: Vec[]): number[] {
  const mid = centroid(avatar)
  const size = polyBounds({ pts: avatar })
  const touch = Math.min(size.w, size.h) * 0.02
  return pts.map((a, i) => {
    const b = pts[(i + 1) % pts.length] ?? a
    const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
    const nx = clockwise ? b.y - a.y : a.y - b.y
    const ny = clockwise ? a.x - b.x : b.x - a.x
    const q = nearest(m, avatar)
    const from = Math.hypot(m.x - q.x, m.y - q.y) > touch ? q : mid
    return nx * (m.x - from.x) + ny * (m.y - from.y) < 0 ? -1 : 1
  })
}

export function boxRing(box: ContentBox): RingPoly {
  return rectPoly(box, 0)
}

export function polyBounds(poly: Pick<RingPoly, 'pts'>): ContentBox {
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -Infinity
  let y1 = -Infinity
  for (const q of poly.pts) {
    if (q.x < x0) x0 = q.x
    if (q.x > x1) x1 = q.x
    if (q.y < y0) y0 = q.y
    if (q.y > y1) y1 = q.y
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }
}

function rectPoly(box: ContentBox, inset: number): RingPoly {
  const x0 = box.x + inset
  const y0 = box.y + inset
  const x1 = box.x + box.w - inset
  const y1 = box.y + box.h - inset
  return polyOf([{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }])
}

function nearest(p: Vec, pts: Vec[]): Vec {
  let best = pts[0] ?? p
  let bd = Infinity
  for (const q of pts) {
    const d = (q.x - p.x) ** 2 + (q.y - p.y) ** 2
    if (d < bd) {
      bd = d
      best = q
    }
  }
  return best
}

function signedArea(pts: Vec[]): number {
  let area = 0
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]
    const b = pts[(i + 1) % pts.length]
    if (a && b) area += a.x * b.y - b.x * a.y
  }
  return area / 2
}

export function ringGeometry(measure: EffectMeasure, box: ContentBox = measure.box): RingGeometry {
  const ring = measure.host?.ring
  const minD = Math.min(box.w, box.h)
  if (!ring) {
    const outer = rectPoly(box, 0)
    const inner = rectPoly(box, minD * 0.115)
    return { outer, inner, band: rectPoly(box, minD * 0.058) }
  }
  const toPx = (f: Vec): Vec => ({ x: box.x + f.x * box.w, y: box.y + f.y * box.h })
  const outerPts = ring.outer.map(toPx)
  const innerPts = ring.inner.map(toPx)
  const bandPts = outerPts.map((o) => {
    const q = nearest(o, innerPts)
    return { x: (o.x + q.x) / 2, y: (o.y + q.y) / 2 }
  })
  return { outer: polyOf(outerPts, innerPts), band: polyOf(bandPts, innerPts), inner: polyOf(innerPts) }
}

export function ringAt(poly: RingPoly, s: number): RingSample {
  const n = poly.pts.length
  const first = poly.pts[0] ?? { x: 0, y: 0 }
  if (n < 2 || poly.total <= 0) return { p: first, n: { x: 0, y: -1 }, t: { x: 1, y: 0 } }
  const u = ((s % poly.total) + poly.total) % poly.total
  let lo = 0
  let hi = n - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if ((poly.cum[mid] ?? 0) <= u) lo = mid
    else hi = mid - 1
  }
  const i = lo
  const a = poly.pts[i] ?? first
  const b = poly.pts[(i + 1) % n] ?? first
  const segLen = (poly.cum[i + 1] ?? 0) - (poly.cum[i] ?? 0) || 1
  const k = (u - (poly.cum[i] ?? 0)) / segLen
  const tx = (b.x - a.x) / segLen
  const ty = (b.y - a.y) / segLen
  const side = poly.facing?.[i] ?? 1
  const nrm = poly.clockwise ? { x: ty * side, y: -tx * side } : { x: -ty * side, y: tx * side }
  return { p: { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k }, n: nrm, t: { x: tx, y: ty } }
}

export function ringSpan(poly: RingPoly, y: number): { x0: number; x1: number } | null {
  const xs: number[] = []
  const n = poly.pts.length
  for (let i = 0; i < n; i++) {
    const a = poly.pts[i]
    const b = poly.pts[(i + 1) % n]
    if (!a || !b || a.y === b.y) continue
    if ((a.y <= y && b.y > y) || (b.y <= y && a.y > y)) xs.push(a.x + ((y - a.y) / (b.y - a.y)) * (b.x - a.x))
  }
  if (xs.length < 2) return null
  let x0 = Infinity
  let x1 = -Infinity
  for (const x of xs) {
    if (x < x0) x0 = x
    if (x > x1) x1 = x
  }
  return { x0, x1 }
}

export function ringExtreme(poly: RingPoly, dir: Vec): RingSample {
  let bestIdx = 0
  let best = -Infinity
  poly.pts.forEach((q, i) => {
    const d = q.x * dir.x + q.y * dir.y
    if (d > best) {
      best = d
      bestIdx = i
    }
  })
  return ringAt(poly, poly.cum[bestIdx] ?? 0)
}

export interface CycleEvent {
  age: number
  seed: number
}

export function activeEvents(t: number, interval: number, life: number, seed: number): CycleEvent[] {
  const out: CycleEvent[] = []
  const kMin = Math.max(0, Math.floor((t - life) / interval) - 1)
  const kMax = Math.floor(t / interval)
  for (let k = kMin; k <= kMax; k++) {
    const start = k * interval + hash01(seed + k * 11) * interval * 0.6
    const age = t - start
    if (age >= 0 && age < life) out.push({ age, seed: seed + k * 97 })
  }
  return out
}

export function easeOut(x: number): number {
  return 1 - Math.pow(1 - Math.max(0, Math.min(1, x)), 3)
}

export function easeIn(x: number): number {
  const c = Math.max(0, Math.min(1, x))
  return c * c * c
}

export interface GeometryMemo<T> {
  get: (scope: unknown, key: number, build: () => T) => T
  clear: () => void
}

export function geometryMemo<T>(limit = 32): GeometryMemo<T> {
  let owner: unknown = null
  const map = new Map<number, T>()
  return {
    get(scope, key, build) {
      if (scope !== owner) {
        owner = scope
        map.clear()
      }
      const hit = map.get(key)
      if (hit !== undefined) return hit
      if (map.size >= limit) map.clear()
      const value = build()
      map.set(key, value)
      return value
    },
    clear() {
      owner = null
      map.clear()
    },
  }
}

export interface EffectFrame {
  g: CanvasRenderingContext2D
  t: number
  reduced: boolean
  box: ContentBox
  ring: RingGeometry
}
