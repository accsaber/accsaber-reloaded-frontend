import { hash01 } from '@/utils/random'

export interface WearSpec {
  chips: number
  cracks: number
  dark: string
  flakes: boolean
}

export interface HauntSpec {
  color: string
  opacity: number
  cycleS: number
}

export interface WearBite {
  x: number
  y: number
  r: number
  edge: 0 | 1 | 2 | 3
  k: number
}

export interface WearCrack {
  points: [number, number][]
  width: number
  branches: WearCrack[]
}

const BITE_CRACK_WIDTH = 0.022
const EDGE_CRACK_WIDTH = 0.016
const MAX_BRANCHES = 2

export function seedNumber(seed: string): number {
  let h = 7
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 100003
  return h
}

const r3 = (n: number) => Math.round(n * 1000) / 1000

export function bitePath(b: WearBite, w: number, h: number, scale = 1): string {
  const unit = Math.min(w, h) * scale
  const pts: string[] = []
  const n = 9
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    const rr = b.r * unit * (0.55 + hash01(b.k * 13 + i * 7) * 0.7)
    pts.push(`${r3(b.x * w + Math.cos(a) * rr)},${r3(b.y * h + Math.sin(a) * rr)}`)
  }
  return `M${pts.join(' L')} Z`
}

export function wearBites(seed: string, count: number): WearBite[] {
  const s = seedNumber(seed)
  const out: WearBite[] = []
  for (let i = 0; i < count; i++) {
    const k = s + i * 97
    const edge = Math.floor(hash01(k * 3) * 4) as 0 | 1 | 2 | 3
    const along = 0.08 + hash01(k * 5) * 0.84
    const r = 0.06 + hash01(k * 11) * 0.07
    const x = edge === 1 ? 1 : edge === 3 ? 0 : along
    const y = edge === 0 ? 0 : edge === 2 ? 1 : along
    out.push({ x, y, r, edge, k })
  }
  return out
}

function inwardAngle(edge: number): number {
  return edge === 0 ? Math.PI / 2 : edge === 1 ? Math.PI : edge === 2 ? -Math.PI / 2 : 0
}

function crackFrom(x: number, y: number, angle: number, k: number, steps: number, width: number, depth: number): WearCrack {
  const points: [number, number][] = [[r3(x), r3(y)]]
  const branches: WearCrack[] = []
  let a = angle
  let px = x
  let py = y
  for (let i = 0; i < steps; i++) {
    const len = 0.025 + hash01(k * 7 + i) * 0.045
    a += (hash01(k * 11 + i) - 0.5) * 1.1
    px += Math.cos(a) * len
    py += Math.sin(a) * len
    points.push([r3(px), r3(py)])
    const left = steps - i
    if (depth > 0 && i > 0 && left > 2 && branches.length < MAX_BRANCHES && hash01(k * 17 + i) < 0.3) {
      const side = hash01(k * 19 + i) < 0.5 ? -1 : 1
      const fork = a + side * (0.55 + hash01(k * 23 + i) * 0.6)
      branches.push(crackFrom(px, py, fork, k * 31 + i * 7 + 1, Math.ceil(left * 0.6), width * 0.55, depth - 1))
    }
  }
  return { points, width, branches }
}

export function wearCracks(seed: string, bites: WearBite[], extra: number): WearCrack[] {
  const s = seedNumber(seed) + 311
  const out: WearCrack[] = []
  bites.forEach((b, i) => {
    const angle = inwardAngle(b.edge) + (hash01(s + i) - 0.5) * 0.9
    out.push(crackFrom(b.x, b.y, angle, s + i * 53, 5 + Math.floor(hash01(s + i * 3) * 4), BITE_CRACK_WIDTH, 1))
  })
  for (let i = 0; i < extra; i++) {
    const k = s + 400 + i * 67
    const edge = Math.floor(hash01(k * 17) * 4)
    const along = hash01(k * 3) * 0.8 + 0.1
    const x = edge === 1 ? 1 : edge === 3 ? 0 : along
    const y = edge === 0 ? 0 : edge === 2 ? 1 : along
    const angle = inwardAngle(edge) + (hash01(k * 5) - 0.5) * 1.2
    out.push(crackFrom(x, y, angle, k, 6 + Math.floor(hash01(k * 9) * 5), EDGE_CRACK_WIDTH, 1))
  }
  return out
}

function sliver(points: [number, number][], sx: number, sy: number, rootWidth: number): string {
  const n = points.length - 1
  const p = points.map(([x, y]) => [x * sx, y * sy] as const)
  const k = Math.round((points[0]?.[0] ?? 0) * 997 + (points[0]?.[1] ?? 0) * 613)
  const left: string[] = []
  const right: string[] = []
  for (let i = 0; i <= n; i++) {
    const [ax, ay] = p[Math.max(0, i - 1)] ?? [0, 0]
    const [bx, by] = p[Math.min(n, i + 1)] ?? [0, 0]
    const [x, y] = p[i] ?? [0, 0]
    const dx = bx - ax
    const dy = by - ay
    const l = Math.hypot(dx, dy) || 1
    const nx = -dy / l
    const ny = dx / l
    const taper = rootWidth * Math.pow(1 - i / n, 0.75)
    const wl = taper * (0.5 + hash01(k + i * 3) * 0.7)
    const wr = taper * (0.5 + hash01(k + i * 5) * 0.7)
    left.push(`${r3(x + nx * wl)},${r3(y + ny * wl)}`)
    right.push(`${r3(x - nx * wr)},${r3(y - ny * wr)}`)
  }
  return `M${left.join(' L')} L${right.reverse().join(' L')} Z`
}

export function crackPath(c: WearCrack, sx = 1, sy = 1, rootWidth = c.width): string {
  const parts = [sliver(c.points, sx, sy, rootWidth)]
  for (const b of c.branches) parts.push(crackPath(b, sx, sy, rootWidth * (b.width / c.width)))
  return parts.join(' ')
}

function anchorPoints(points: [number, number][], ox: number, oy: number, w: number, h: number, unit: number): [number, number][] {
  return points.map(([x, y]) => [r3(ox * w + (x - ox) * unit), r3(oy * h + (y - oy) * unit)])
}

function anchorFrom(c: WearCrack, ox: number, oy: number, w: number, h: number, unit: number): WearCrack {
  return {
    points: anchorPoints(c.points, ox, oy, w, h, unit),
    width: c.width,
    branches: c.branches.map((b) => anchorFrom(b, ox, oy, w, h, unit)),
  }
}

export function anchorCrack(c: WearCrack, w: number, h: number, scale = 1): WearCrack {
  const [ox, oy] = c.points[0] ?? [0, 0]
  return anchorFrom(c, ox, oy, w, h, Math.min(w, h) * scale)
}
