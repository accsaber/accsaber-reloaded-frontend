import type { ItemTypeKey } from '@/types/api/items'
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

export function boxScale(minD: number, min = 0.7): number {
  return Math.max(min, Math.min(1.8, minD / 140))
}

export function isFieldKey(typeKey: ItemTypeKey | undefined): boolean {
  return typeKey === 'theme' || typeKey === 'profile_thumbnail_background'
}

export function pctSize(minD: number, pct: number, minPx: number, maxPx: number): number {
  return Math.max(minPx, Math.min(maxPx, (pct / 100) * minD))
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
}

export interface RingGeometry {
  outer: RingPoly
  band: RingPoly
  inner: RingPoly
  centroid: Vec
}

export function padBox(box: ContentBox, pad: number): ContentBox {
  return { x: box.x + pad, y: box.y + pad, w: box.w, h: box.h }
}

function polyOf(pts: Vec[]): RingPoly {
  const cum: number[] = [0]
  for (let i = 1; i <= pts.length; i++) {
    const a = pts[i - 1]
    const b = pts[i % pts.length]
    cum.push((cum[i - 1] ?? 0) + (a && b ? Math.hypot(b.x - a.x, b.y - a.y) : 0))
  }
  return { pts, cum, total: cum[pts.length] ?? 0 }
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
    return { outer, inner, band: rectPoly(box, minD * 0.058), centroid: { x: box.x + box.w / 2, y: box.y + box.h / 2 } }
  }
  const toPx = (f: Vec): Vec => ({ x: box.x + f.x * box.w, y: box.y + f.y * box.h })
  const outerPts = ring.outer.map(toPx)
  const innerPts = ring.inner.map(toPx)
  const bandPts = outerPts.map((o) => {
    const q = nearest(o, innerPts)
    return { x: (o.x + q.x) / 2, y: (o.y + q.y) / 2 }
  })
  const centroid = outerPts.reduce((acc, q) => ({ x: acc.x + q.x / outerPts.length, y: acc.y + q.y / outerPts.length }), { x: 0, y: 0 })
  return { outer: polyOf(outerPts), band: polyOf(bandPts), inner: polyOf(innerPts), centroid }
}

export function ringAt(poly: RingPoly, s: number): RingSample {
  const n = poly.pts.length
  const first = poly.pts[0] ?? { x: 0, y: 0 }
  if (n < 2 || poly.total <= 0) return { p: first, n: { x: 0, y: -1 }, t: { x: 1, y: 0 } }
  const u = ((s % poly.total) + poly.total) % poly.total
  let i = 0
  while (i < n - 1 && (poly.cum[i + 1] ?? 0) <= u) i++
  const a = poly.pts[i] ?? first
  const b = poly.pts[(i + 1) % n] ?? first
  const segLen = (poly.cum[i + 1] ?? 0) - (poly.cum[i] ?? 0) || 1
  const k = (u - (poly.cum[i] ?? 0)) / segLen
  const tx = (b.x - a.x) / segLen
  const ty = (b.y - a.y) / segLen
  const cw = signedArea(poly.pts) > 0
  const nrm = cw ? { x: ty, y: -tx } : { x: -ty, y: tx }
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
  return { x0: Math.min(...xs), x1: Math.max(...xs) }
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
  k: number
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
    if (age >= 0 && age < life) out.push({ k, age, seed: seed + k * 97 })
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
