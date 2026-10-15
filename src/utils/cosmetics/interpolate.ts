import type { BorderColorFill, BorderColorStateValue, BorderShapeStateValue } from '@/types/cosmetics/border'
import type { Gradient, GradientStop, Loop } from '@/types/cosmetics/common'
import type { TitleStateValue } from '@/types/cosmetics/title'
import { lerpHex } from '@/utils/color'
import { clamp } from '@/utils/math'

export function gradientToCss(g: Gradient): string {
  const stops = g.stops
    .slice()
    .sort((a, b) => a.atPct - b.atPct)
    .map((s) => `${s.hex} ${s.atPct}%`)
    .join(', ')
  if (g.type === 'linear') return `linear-gradient(${g.angleDeg}deg, ${stops})`
  if (g.type === 'radial') {
    const cx = g.centerXPct ?? 50
    const cy = g.centerYPct ?? 50
    const r = g.radiusPct ?? 50
    return `radial-gradient(${r}% ${r}% at ${cx}% ${cy}%, ${stops})`
  }
  const cx = g.centerXPct ?? 50
  const cy = g.centerYPct ?? 50
  const angle = g.angleDeg ?? 0
  return `conic-gradient(from ${angle}deg at ${cx}% ${cy}%, ${stops})`
}

export function fillToCss(fill: BorderColorFill): string {
  if (fill.type === 'solid') return fill.hex
  if (fill.type === 'pixel_metal') {
    return `linear-gradient(135deg, ${fill.highlight} 0%, ${fill.base} 50%, ${fill.shadow} 100%)`
  }
  if (fill.type === 'cosmic') {
    const nebula = fill.nebulas[0] ?? fill.accent
    return `radial-gradient(circle at 30% 30%, ${nebula} 0%, ${fill.space} 60%)`
  }
  if (fill.type === 'toon') {
    return `repeating-linear-gradient(135deg, ${fill.ink} 0px, ${fill.ink} 7px, ${fill.line} 7px, ${fill.line} 9px)`
  }
  if (fill.type === 'brew') {
    const cs = fill.colors
    return `linear-gradient(135deg, ${cs.map((c, i) => `${c} ${Math.round((i / Math.max(1, cs.length - 1)) * 100)}%`).join(', ')})`
  }
  if (fill.type === 'wood') {
    return `repeating-linear-gradient(180deg, ${fill.base} 0px, ${fill.light} 5px, ${fill.base} 9px, ${fill.dark} 11px, ${fill.dark} 12px)`
  }
  if (fill.type === 'candle') {
    return `radial-gradient(circle at 30% 35%, ${fill.glow} 0%, ${fill.dark} 45%), radial-gradient(circle at 75% 70%, ${fill.glow} 0%, ${fill.dark} 40%)`
  }
  if (fill.type === 'prism') {
    const lo = fill.lo ?? fill.rose
    const hi = fill.hi ?? fill.edge
    return `linear-gradient(135deg, ${lo} 0%, ${hi} 50%, ${lo} 100%)`
  }
  if (fill.type === 'grove') {
    return `linear-gradient(135deg, ${fill.deep} 0%, ${fill.moss} 60%, ${fill.vine} 100%)`
  }
  if (fill.type === 'regalia') {
    return `linear-gradient(115deg, ${fill.shadow} 0%, ${fill.silver} 45%, ${fill.core ?? '#ffffff'} 55%, ${fill.body} 100%)`
  }
  if (fill.type === 'colossus') {
    return `linear-gradient(160deg, ${fill.stoneA} 0%, ${fill.stoneB} 55%, ${fill.seam} 100%)`
  }
  if (fill.type === 'stolenflame') {
    return `linear-gradient(135deg, ${fill.night} 0%, ${fill.flameDeep} 55%, ${fill.flame} 78%, ${fill.night} 100%)`
  }
  if (fill.type === 'eclipse') {
    return `radial-gradient(circle at 50% 8%, ${fill.corona} 0%, ${fill.dusk} 22%, ${fill.sky} 100%)`
  }
  if (fill.type === 'dominion') {
    const body = fill.body ?? '#ffffff'
    const stops = fill.colors.map((c, i) => `${c} ${Math.round((i / fill.colors.length) * 100)}%`)
    return `linear-gradient(100deg, ${body} 0%, ${stops.join(', ')}, ${body} 100%)`
  }
  if (fill.type === 'confetti') {
    const cs = fill.colors
    const slivers = cs.map((c, i) => `${c} ${8 + i * 10}% ${10 + i * 10}%`).join(', ')
    return `linear-gradient(135deg, ${fill.dark} 0%, ${slivers}, ${fill.dark} 100%)`
  }
  if (fill.type === 'jewel') {
    return `radial-gradient(circle at 30% 30%, ${fill.gems[0]} 0%, ${fill.velvet} 55%)`
  }
  if (fill.type === 'laser') {
    return `linear-gradient(90deg, ${fill.dark} 0%, ${fill.glow} 42%, ${fill.core} 50%, ${fill.glow} 58%, ${fill.dark} 100%)`
  }
  if (fill.type === 'chart') {
    return `linear-gradient(120deg, ${fill.paper} 0%, ${fill.paper} 52%, ${fill.route} 53%, ${fill.paper} 54%, ${fill.paper} 100%)`
  }
  if (fill.type === 'hazard') {
    return `repeating-linear-gradient(45deg, ${fill.a} 0px, ${fill.a} 10px, ${fill.b} 10px, ${fill.b} 20px)`
  }
  if (fill.type === 'warp') {
    return `radial-gradient(circle at 50% 50%, ${fill.core} 0%, ${fill.space} 55%)`
  }
  return gradientToCss(fill)
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
}

export function lerpNumber(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function lerpStops(a: GradientStop[], b: GradientStop[], t: number): GradientStop[] {
  if (a.length !== b.length) return t < 0.5 ? a : b
  return a.map((sa, i) => ({
    atPct: lerpNumber(sa.atPct, b[i].atPct, t),
    hex: lerpHex(sa.hex, b[i].hex, t, true),
  }))
}

export function interpolateGradient(a: Gradient, b: Gradient, t: number): Gradient {
  if (a.type !== b.type) return t < 0.5 ? a : b
  if (a.type === 'linear' && b.type === 'linear') {
    return {
      type: 'linear',
      angleDeg: lerpNumber(a.angleDeg, b.angleDeg, t),
      stops: lerpStops(a.stops, b.stops, t),
    }
  }
  if (a.type === 'radial' && b.type === 'radial') {
    return {
      type: 'radial',
      centerXPct: lerpNumber(a.centerXPct ?? 50, b.centerXPct ?? 50, t),
      centerYPct: lerpNumber(a.centerYPct ?? 50, b.centerYPct ?? 50, t),
      radiusPct: lerpNumber(a.radiusPct ?? 50, b.radiusPct ?? 50, t),
      stops: lerpStops(a.stops, b.stops, t),
    }
  }
  if (a.type === 'conic' && b.type === 'conic') {
    return {
      type: 'conic',
      centerXPct: lerpNumber(a.centerXPct ?? 50, b.centerXPct ?? 50, t),
      centerYPct: lerpNumber(a.centerYPct ?? 50, b.centerYPct ?? 50, t),
      angleDeg: lerpNumber(a.angleDeg ?? 0, b.angleDeg ?? 0, t),
      stops: lerpStops(a.stops, b.stops, t),
    }
  }
  return t < 0.5 ? a : b
}

const CANVAS_FILL_LIST = [
  'cosmic', 'toon', 'prism', 'grove', 'regalia', 'colossus', 'stolenflame', 'dominion', 'eclipse', 'candle', 'wood', 'brew',
  'confetti', 'jewel', 'laser', 'chart', 'hazard', 'warp',
] as const

const CANVAS_FILL_TYPES: ReadonlySet<string> = new Set(CANVAS_FILL_LIST)

export type CanvasFill = Extract<BorderColorFill, { type: (typeof CANVAS_FILL_LIST)[number] }>

export function isCanvasFill(fill: BorderColorFill): fill is CanvasFill {
  return CANVAS_FILL_TYPES.has(fill.type)
}

export function interpolateFill(a: BorderColorFill, b: BorderColorFill, t: number): BorderColorFill {
  if (isCanvasFill(a) || isCanvasFill(b)) {
    return t < 0.5 ? a : b
  }
  if (a.type === 'solid' && b.type === 'solid') {
    return { type: 'solid', hex: lerpHex(a.hex, b.hex, t, true) }
  }
  if (a.type === 'pixel_metal' && b.type === 'pixel_metal') {
    return {
      type: 'pixel_metal',
      base: lerpHex(a.base, b.base, t, true),
      highlight: lerpHex(a.highlight, b.highlight, t, true),
      shadow: lerpHex(a.shadow, b.shadow, t, true),
    }
  }
  if (a.type !== 'solid' && a.type !== 'pixel_metal' && b.type !== 'solid' && b.type !== 'pixel_metal') {
    return interpolateGradient(a, b, t)
  }
  return t < 0.5 ? a : b
}

export function interpolateBorderColorState(
  a: BorderColorStateValue,
  b: BorderColorStateValue,
  t: number,
): BorderColorStateValue {
  return {
    atMs: lerpNumber(a.atMs, b.atMs, t),
    fill: interpolateFill(a.fill, b.fill, t),
    filters: t < 0.5 ? a.filters : b.filters,
  }
}

export function interpolateTitleState(
  a: TitleStateValue,
  b: TitleStateValue,
  t: number,
): TitleStateValue {
  const out: TitleStateValue = { atMs: lerpNumber(a.atMs, b.atMs, t) }
  if (a.color && b.color) out.color = lerpHex(a.color, b.color, t, true)
  else out.color = t < 0.5 ? a.color : b.color
  if (a.gradient && b.gradient) out.gradient = interpolateGradient(a.gradient, b.gradient, t)
  else out.gradient = t < 0.5 ? a.gradient : b.gradient
  if (a.letterSpacingPx != null && b.letterSpacingPx != null) {
    out.letterSpacingPx = lerpNumber(a.letterSpacingPx, b.letterSpacingPx, t)
  } else {
    out.letterSpacingPx = t < 0.5 ? a.letterSpacingPx : b.letterSpacingPx
  }
  out.fontWeight = t < 0.5 ? a.fontWeight : b.fontWeight
  out.fontStyle = t < 0.5 ? a.fontStyle : b.fontStyle
  out.glow = a.glow && b.glow
    ? { color: lerpHex(a.glow.color, b.glow.color, t, true), blurEm: lerpNumber(a.glow.blurEm, b.glow.blurEm, t) }
    : t < 0.5 ? a.glow : b.glow
  out.outline = a.outline && b.outline
    ? { color: lerpHex(a.outline.color, b.outline.color, t, true), widthPx: lerpNumber(a.outline.widthPx, b.outline.widthPx, t) }
    : t < 0.5 ? a.outline : b.outline
  return out
}

export function pickInterpolatedState<S extends { atMs: number }>(
  options: { states: S[]; durationMs?: number; loop?: Loop },
  tNow: number,
  interp: (a: S, b: S, t: number) => S,
): S {
  const { states } = options
  if (states.length === 1) return states[0]

  const sorted = [...states].sort((a, b) => a.atMs - b.atMs)
  const lastAt = sorted[sorted.length - 1].atMs
  const total = options.durationMs ?? lastAt
  if (total <= 0) return sorted[0]

  const loop: Loop = options.loop ?? 'loop'
  let t: number
  if (loop === 'once') {
    t = clamp(tNow, 0, total)
  } else if (loop === 'pingpong') {
    const cycles = Math.floor(tNow / total)
    const inCycle = tNow - cycles * total
    t = cycles % 2 === 0 ? inCycle : total - inCycle
  } else {
    t = ((tNow % total) + total) % total
  }

  let prev = sorted[0]
  let next = sorted[sorted.length - 1]
  for (let i = 0; i < sorted.length - 1; i++) {
    if (t >= sorted[i].atMs && t <= sorted[i + 1].atMs) {
      prev = sorted[i]
      next = sorted[i + 1]
      break
    }
  }
  if (prev === next) return prev
  const range = next.atMs - prev.atMs
  if (range <= 0) return prev
  const localT = (t - prev.atMs) / range
  return interp(prev, next, easeInOut(localT))
}

export function isAnimated(value: { states: Array<unknown>; durationMs?: number } | null | undefined): boolean {
  if (!value) return false
  return value.states.length > 1
}

type MorphPoint = [number, number]

export interface MorphRun {
  closed: boolean
  frames: MorphPoint[][]
}

export type ShapeTrack = string | MorphRun[]

function sampleRun(pathEl: SVGPathElement, samples: number, closed: boolean): MorphPoint[] {
  const total = pathEl.getTotalLength()
  if (total === 0 || samples < 2) return []
  const span = closed ? samples : samples - 1
  const out: MorphPoint[] = new Array(samples)
  for (let i = 0; i < samples; i++) {
    const p = pathEl.getPointAtLength((i / span) * total)
    out[i] = [p.x, p.y]
  }
  return out
}

function alignmentCost(a: MorphPoint[], b: MorphPoint[], offset: number, reverse: boolean): number {
  const n = a.length
  let cost = 0
  for (let i = 0; i < n; i++) {
    const j = reverse ? (n - 1 - ((i + offset) % n) + n) % n : (i + offset) % n
    const dx = a[i][0] - b[j][0]
    const dy = a[i][1] - b[j][1]
    cost += dx * dx + dy * dy
  }
  return cost
}

function alignRun(reference: MorphPoint[], target: MorphPoint[], closed: boolean): MorphPoint[] {
  const n = reference.length
  if (n === 0 || target.length !== n) return target
  const offsets = closed ? n : 1
  let best = { cost: Infinity, offset: 0, reverse: false }
  for (const reverse of [false, true]) {
    for (let offset = 0; offset < offsets; offset++) {
      const cost = alignmentCost(reference, target, offset, reverse)
      if (cost < best.cost) best = { cost, offset, reverse }
    }
  }
  return target.map((_, i) => {
    const j = best.reverse ? (n - 1 - ((i + best.offset) % n) + n) % n : (i + best.offset) % n
    return target[j]
  })
}

function splitSubpaths(d: string): string[] {
  return d.split(/(?=M)/).map((part) => part.trim()).filter(Boolean)
}

function isClosed(d: string): boolean {
  return /z\s*$/i.test(d)
}

function morphRuns(ds: string[], svg: SVGSVGElement, samples: number): MorphRun[] | null {
  const split = ds.map(splitSubpaths)
  const count = split[0].length
  if (split.some((runs) => runs.length !== count)) return null
  const path = document.createElementNS(svg.namespaceURI, 'path') as SVGPathElement
  svg.appendChild(path)
  try {
    return split[0].map((first, ri) => {
      const closed = isClosed(first)
      const frames = split.map((runs) => {
        path.setAttribute('d', runs[ri])
        return sampleRun(path, samples, closed)
      })
      return { closed, frames: frames.map((f) => alignRun(frames[0], f, closed)) }
    })
  } finally {
    svg.removeChild(path)
  }
}

export function shapeTracks(states: BorderShapeStateValue[], samples: number): ShapeTrack[] {
  const first = states[0]?.paths ?? []
  if (typeof document === 'undefined') return first.map((p) => p.d)
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('style', 'position:absolute;width:0;height:0;visibility:hidden;pointer-events:none;')
  document.body.appendChild(svg)
  try {
    return first.map((p, pi) => {
      const ds = states.map((st) => st.paths?.[pi]?.d ?? p.d)
      if (ds.every((d) => d === p.d)) return p.d
      return morphRuns(ds, svg, samples) ?? p.d
    })
  } finally {
    document.body.removeChild(svg)
  }
}

function pointsToPathD(points: MorphPoint[], closed: boolean): string {
  if (points.length === 0) return ''
  let d = `M${points[0][0].toFixed(2)},${points[0][1].toFixed(2)}`
  for (let i = 1; i < points.length; i++) d += `L${points[i][0].toFixed(2)},${points[i][1].toFixed(2)}`
  return closed ? `${d}Z` : d
}

function lerpRun(a: MorphPoint[], b: MorphPoint[], t: number): MorphPoint[] {
  if (t === 0 || a.length !== b.length) return a
  return a.map(([ax, ay], i) => [ax + (b[i][0] - ax) * t, ay + (b[i][1] - ay) * t])
}

export function trackPathD(track: ShapeTrack, from: number, to: number, t: number): string {
  if (typeof track === 'string') return track
  return track.map((run) => pointsToPathD(lerpRun(run.frames[from], run.frames[to], t), run.closed)).join('')
}
