export interface ShapeTrace {
  ds: string[]
  viewBox: string
  wall?: string
  hole?: string
}

export interface TraceLoop {
  pts: { x: number; y: number }[]
  len: number
}

export interface TraceBox {
  x: number
  y: number
  w: number
  h: number
}

export interface TracedShape {
  loops: TraceLoop[]
  main: number
  vb: TraceBox
}

const SAMPLES = 150

export function traceBox(viewBox: string): TraceBox {
  const nums = viewBox.split(' ').map(Number)
  const ok = nums.length === 4 && nums.every((n) => Number.isFinite(n)) && nums[2] > 0 && nums[3] > 0
  return ok ? { x: nums[0], y: nums[1], w: nums[2], h: nums[3] } : { x: 0, y: 0, w: 100, h: 100 }
}

export function splitSubpaths(d: string): string[] {
  return d.split(/(?=M)/).map((part) => part.trim()).filter(Boolean)
}

function sampleLoop(d: string): TraceLoop | null {
  const el = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  el.setAttribute('d', d)
  let len = 0
  try {
    len = el.getTotalLength()
  } catch {
    return null
  }
  if (!Number.isFinite(len) || len < 4) return null
  const pts: TraceLoop['pts'] = []
  for (let k = 0; k <= SAMPLES; k++) {
    const p = el.getPointAtLength((len * k) / SAMPLES)
    pts.push({ x: p.x, y: p.y })
  }
  return { pts, len }
}

export function traceShape(trace: ShapeTrace | null | undefined): TracedShape {
  if (!trace || trace.ds.length === 0 || typeof document === 'undefined') {
    return { loops: [], main: 0, vb: { x: 0, y: 0, w: 100, h: 100 } }
  }
  const loops = trace.ds.flatMap(splitSubpaths).map(sampleLoop).filter((l): l is TraceLoop => !!l)
  let main = 0
  loops.forEach((lp, i) => {
    if (lp.len > loops[main].len) main = i
  })
  return { loops, main, vb: traceBox(trace.viewBox) }
}

const JUMP = 4

export function onEdge(lp: TraceLoop, u: number): boolean {
  const n = lp.pts.length - 1
  const i = Math.min(n - 1, Math.floor(u * n))
  const seg = Math.hypot(lp.pts[i + 1].x - lp.pts[i].x, lp.pts[i + 1].y - lp.pts[i].y)
  return seg < (lp.len / n) * JUMP
}

export function loopPoint(lp: TraceLoop, u: number, vb: TraceBox, w: number, h: number): { x: number; y: number } {
  const n = lp.pts.length - 1
  const f = (((u % 1) + 1) % 1) * n
  const i = Math.floor(f)
  const frac = f - i
  const a = lp.pts[i]
  const b = lp.pts[Math.min(n, i + 1)]
  return {
    x: ((a.x + (b.x - a.x) * frac - vb.x) / vb.w) * w,
    y: ((a.y + (b.y - a.y) * frac - vb.y) / vb.h) * h,
  }
}
