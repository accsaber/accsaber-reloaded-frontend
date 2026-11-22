import type { BorderShapeStateValue } from '@/types/cosmetics/border'
import { splitSubpaths } from '@/utils/cosmetics/shapeTrace'

type MorphPoint = [number, number]

export interface MorphRun {
  closed: boolean
  frames: MorphPoint[][]
  ds: string[]
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
      const aligned = frames.map((f) => alignRun(frames[0], f, closed))
      return { closed, frames: aligned, ds: aligned.map((f) => pointsToPathD(f, closed)) }
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

function runPathD(run: MorphRun, from: number, to: number, t: number): string {
  const a = run.frames[from]
  const b = run.frames[to]
  if (t === 0 || a.length !== b.length) return run.ds[from]
  if (a.length === 0) return ''
  let d = ''
  for (let i = 0; i < a.length; i++) {
    const x = a[i][0] + (b[i][0] - a[i][0]) * t
    const y = a[i][1] + (b[i][1] - a[i][1]) * t
    d += `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`
  }
  return run.closed ? `${d}Z` : d
}

export function trackPathD(track: ShapeTrack, from: number, to: number, t: number): string {
  if (typeof track === 'string') return track
  let d = ''
  for (const run of track) d += runPathD(run, from, to, t)
  return d
}
