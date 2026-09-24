import type { BorderShapePathValue, BorderShapeValue } from '@/types/api/items'
import { DEFAULT_AVATAR_MASK } from '@/utils/avatarBox'

export interface FrameBounds {
  x: number
  y: number
  w: number
  h: number
}

export interface ShapeMask {
  url: string
  bounds: FrameBounds
}

const SVG_NS = 'http://www.w3.org/2000/svg'
const boundsCache = new Map<string, FrameBounds>()

function isThemed(ref: string | undefined): boolean {
  return ref === 'currentColor' || ref === 'inherit'
}

function shapePaths(shape: BorderShapeValue): BorderShapePathValue[] {
  return shape.states.flatMap((state) => state.paths ?? [])
}

export function shapeViewBox(shape: BorderShapeValue | null | undefined): FrameBounds {
  const parts = (shape?.viewBox ?? '0 0 100 100').split(/[\s,]+/).map(Number)
  if (parts.length !== 4 || !parts.every((n) => Number.isFinite(n))) return { x: 0, y: 0, w: 100, h: 100 }
  const [x, y, w, h] = parts as [number, number, number, number]
  return { x, y, w, h }
}

function pathBounds(paths: BorderShapePathValue[], viewBox: FrameBounds): FrameBounds[] {
  if (typeof document === 'undefined') return []
  const svg = document.createElementNS(SVG_NS, 'svg')
  svg.setAttribute('viewBox', `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`)
  svg.setAttribute('width', '0')
  svg.setAttribute('height', '0')
  svg.style.position = 'absolute'
  svg.style.opacity = '0'
  svg.style.pointerEvents = 'none'
  const groups = paths.map((p) => {
    const g = document.createElementNS(SVG_NS, 'g')
    const el = document.createElementNS(SVG_NS, 'path')
    el.setAttribute('d', p.d)
    if (p.transform) el.setAttribute('transform', p.transform)
    g.appendChild(el)
    svg.appendChild(g)
    return g
  })
  document.body.appendChild(svg)
  const out: FrameBounds[] = []
  try {
    groups.forEach((g, i) => {
      const b = g.getBBox()
      const p = paths[i]
      const pad = p?.stroke && p.stroke !== 'none' ? (p.strokeWidth ?? 1) / 2 : 0
      out.push({ x: b.x - pad, y: b.y - pad, w: b.width + pad * 2, h: b.height + pad * 2 })
    })
  } finally {
    svg.remove()
  }
  return out
}

function unionBounds(list: FrameBounds[]): FrameBounds | null {
  const valid = list.filter((b) => b.w > 0 && b.h > 0)
  if (valid.length === 0) return null
  const x0 = Math.min(...valid.map((b) => b.x))
  const y0 = Math.min(...valid.map((b) => b.y))
  const x1 = Math.max(...valid.map((b) => b.x + b.w))
  const y1 = Math.max(...valid.map((b) => b.y + b.h))
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }
}

function overlapRatio(a: FrameBounds, b: FrameBounds): number {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)
  if (w <= 0 || h <= 0) return 0
  const inter = w * h
  return inter / (a.w * a.h + b.w * b.h - inter)
}

function pickBase(list: FrameBounds[], viewBox: FrameBounds): number {
  let best = -1
  let bestScore = 0
  list.forEach((b, i) => {
    const score = overlapRatio(b, viewBox)
    if (score > bestScore) {
      bestScore = score
      best = i
    }
  })
  return best
}

function themedPool(shape: BorderShapeValue): BorderShapePathValue[] {
  const paths = shapePaths(shape)
  const themed = paths.filter((p) => isThemed(p.fill) || isThemed(p.stroke))
  return themed.length > 0 ? themed : paths
}

function cachedBounds(key: string, compute: () => FrameBounds | null, fallback: FrameBounds): FrameBounds {
  const cached = boundsCache.get(key)
  if (cached) return cached
  const result = compute() ?? fallback
  boundsCache.set(key, result)
  return result
}

function pathsKey(paths: BorderShapePathValue[]): string {
  return paths.map((p) => `${p.d}|${p.transform ?? ''}|${p.strokeWidth ?? ''}`).join(';')
}

function basePath(shape: BorderShapeValue, viewBox: FrameBounds): { path: BorderShapePathValue; bounds: FrameBounds } | null {
  const pool = themedPool(shape)
  if (pool.length === 0) return null
  const boxes = pathBounds(pool, viewBox)
  const i = pickBase(boxes, viewBox)
  const path = pool[i]
  const bounds = boxes[i]
  return path && bounds ? { path, bounds } : null
}

export function shapeFrameBounds(shape: BorderShapeValue | null | undefined): FrameBounds {
  const viewBox = shapeViewBox(shape)
  if (!shape || shapePaths(shape).length === 0) return viewBox
  return cachedBounds(`base|${shape.viewBox ?? ''}|${pathsKey(themedPool(shape))}`, () => basePath(shape, viewBox)?.bounds ?? null, viewBox)
}

export function shapeExtentBounds(shape: BorderShapeValue | null | undefined): FrameBounds {
  const viewBox = shapeViewBox(shape)
  if (!shape) return viewBox
  const paths = shapePaths(shape)
  if (paths.length === 0) return viewBox
  return cachedBounds(`extent|${shape.viewBox ?? ''}|${pathsKey(paths)}`, () => unionBounds([...pathBounds(paths, viewBox), viewBox]), viewBox)
}

const MIN_FRAME_MARGIN = 25
const MARGIN_PAD = 2

export function shapeFrameMargin(shape: BorderShapeValue | null | undefined): number {
  if (!shape) return MIN_FRAME_MARGIN
  const f = shapeFrameBounds(shape)
  const e = shapeExtentBounds(shape)
  if (f.w <= 0 || f.h <= 0) return MIN_FRAME_MARGIN
  const reach = Math.max(
    (f.x - e.x) / f.w,
    (e.x + e.w - f.x - f.w) / f.w,
    (f.y - e.y) / f.h,
    (e.y + e.h - f.y - f.h) / f.h,
  )
  return Math.max(MIN_FRAME_MARGIN, Math.ceil(reach * 100 + MARGIN_PAD))
}

export function shapeSilhouetteMask(shape: BorderShapeValue | null | undefined): ShapeMask | null {
  if (!shape) return null
  if (shape.renderMode === 'pixel') return null
  const paths = shapePaths(shape)
  if (paths.length === 0) return null
  const viewBox = shapeViewBox(shape)
  const b = shapeExtentBounds(shape)
  const inner = paths
    .map((p) => {
      const stroke = p.stroke && p.stroke !== 'none' ? 'white' : 'none'
      const fill = p.fill && p.fill !== 'none' ? 'white' : 'none'
      const sw = p.strokeWidth ?? 1
      return `<path d="${p.d}" stroke="${stroke}" stroke-width="${sw}" fill="${fill}" stroke-linecap="${p.strokeLinecap ?? 'butt'}" stroke-linejoin="${p.strokeLinejoin ?? 'miter'}" ${p.transform ? `transform="${p.transform}"` : ''} />`
    })
    .join('')
  const avatar = `<path d="${shape.avatarMask ?? DEFAULT_AVATAR_MASK}" fill="white" />`
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${b.w}" height="${b.h}" viewBox="${b.x} ${b.y} ${b.w} ${b.h}" preserveAspectRatio="none">${inner}${avatar}</svg>`
  return {
    url: `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}")`,
    bounds: {
      x: (b.x - viewBox.x) / viewBox.w,
      y: (b.y - viewBox.y) / viewBox.h,
      w: b.w / viewBox.w,
      h: b.h / viewBox.h,
    },
  }
}

export interface RingVec {
  x: number
  y: number
}

export interface ShapeRing {
  outer: RingVec[]
  inner: RingVec[]
}

const ringCache = new Map<string, ShapeRing | null>()
const RING_SAMPLES = 360
const INNER_SAMPLES = 120

function samplePathPoints(svg: SVGSVGElement, d: string, transform: string | undefined, samples: number): RingVec[] {
  const el = document.createElementNS(SVG_NS, 'path')
  el.setAttribute('d', d)
  if (transform) el.setAttribute('transform', transform)
  svg.appendChild(el)
  const total = el.getTotalLength()
  const matrix = transform ? el.transform.baseVal.consolidate()?.matrix : null
  const out: RingVec[] = []
  for (let i = 0; i < samples; i++) {
    let p: DOMPoint = el.getPointAtLength((i / samples) * total)
    if (matrix) p = new DOMPoint(p.x, p.y).matrixTransform(matrix)
    out.push({ x: p.x, y: p.y })
  }
  el.remove()
  return out
}

function splitRuns(pts: RingVec[], jump: number): RingVec[][] {
  const runs: RingVec[][] = []
  let run: RingVec[] = []
  pts.forEach((p, i) => {
    const prev = pts[i - 1]
    if (prev && Math.hypot(p.x - prev.x, p.y - prev.y) > jump && run.length) {
      runs.push(run)
      run = []
    }
    run.push(p)
  })
  if (run.length) runs.push(run)
  const first = runs[0]
  const last = runs[runs.length - 1]
  if (runs.length > 1 && first && last && first[0] && last[last.length - 1]) {
    const a = first[0]
    const b = last[last.length - 1]
    if (Math.hypot(a.x - b.x, a.y - b.y) <= jump) {
      runs.pop()
      runs[0] = last.concat(first)
    }
  }
  return runs
}

function runArea(run: RingVec[]): number {
  const xs = run.map((p) => p.x)
  const ys = run.map((p) => p.y)
  return (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys))
}

export function shapeRing(shape: BorderShapeValue | null | undefined): ShapeRing | null {
  if (!shape || shape.renderMode === 'pixel' || typeof document === 'undefined') return null
  const viewBox = shapeViewBox(shape)
  const ring = basePath(shape, viewBox)?.path
  if (!ring) return null
  const key = `${shape.viewBox ?? ''}|${ring.d}|${ring.transform ?? ''}|${shape.avatarMask ?? ''}`
  const cached = ringCache.get(key)
  if (cached !== undefined) return cached
  const svg = document.createElementNS(SVG_NS, 'svg')
  svg.setAttribute('viewBox', `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`)
  svg.setAttribute('width', '0')
  svg.setAttribute('height', '0')
  svg.style.position = 'absolute'
  svg.style.opacity = '0'
  document.body.appendChild(svg)
  let result: ShapeRing | null = null
  try {
    const runs = splitRuns(samplePathPoints(svg, ring.d, ring.transform, RING_SAMPLES), Math.min(viewBox.w, viewBox.h) * 0.06)
    const outer = runs.reduce<RingVec[] | null>((acc, r) => (!acc || runArea(r) > runArea(acc) ? r : acc), null)
    const inner = samplePathPoints(svg, shape.avatarMask ?? DEFAULT_AVATAR_MASK, undefined, INNER_SAMPLES)
    const toFrac = (p: RingVec): RingVec => ({ x: (p.x - viewBox.x) / viewBox.w, y: (p.y - viewBox.y) / viewBox.h })
    if (outer && outer.length >= 8) result = { outer: outer.map(toFrac), inner: inner.map(toFrac) }
  } finally {
    svg.remove()
  }
  ringCache.set(key, result)
  return result
}
