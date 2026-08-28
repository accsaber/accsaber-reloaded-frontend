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
  eyes: boolean
}

export interface WearBite {
  x: number
  y: number
  r: number
  edge: 0 | 1 | 2 | 3
  d: string
}

export interface WearCrack {
  points: [number, number][]
}

function seedNumber(seed: string): number {
  let h = 7
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 100003
  return h
}

const r3 = (n: number) => Math.round(n * 1000) / 1000

function bitePath(x: number, y: number, r: number, k: number): string {
  const pts: string[] = []
  const n = 9
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    const rr = r * (0.55 + hash01(k * 13 + i * 7) * 0.7)
    pts.push(`${r3(x + Math.cos(a) * rr)},${r3(y + Math.sin(a) * rr)}`)
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
    out.push({ x, y, r, edge, d: bitePath(x, y, r, k) })
  }
  return out
}

function crackFrom(x: number, y: number, angle: number, k: number, steps: number): WearCrack {
  const points: [number, number][] = [[r3(x), r3(y)]]
  let a = angle
  let px = x
  let py = y
  for (let i = 0; i < steps; i++) {
    const len = 0.04 + hash01(k * 7 + i) * 0.07
    a += (hash01(k * 11 + i) - 0.5) * 1.4
    px += Math.cos(a) * len
    py += Math.sin(a) * len
    points.push([r3(px), r3(py)])
  }
  return { points }
}

export function wearCracks(seed: string, bites: WearBite[], extra: number): WearCrack[] {
  const s = seedNumber(seed) + 311
  const out: WearCrack[] = []
  bites.forEach((b, i) => {
    const inward = b.edge === 0 ? Math.PI / 2 : b.edge === 1 ? Math.PI : b.edge === 2 ? -Math.PI / 2 : 0
    out.push(crackFrom(b.x, b.y, inward + (hash01(s + i) - 0.5) * 0.9, s + i * 53, 3 + Math.floor(hash01(s + i * 3) * 3)))
  })
  for (let i = 0; i < extra; i++) {
    const k = s + 400 + i * 67
    const edge = Math.floor(hash01(k * 17) * 4)
    const along = hash01(k * 3) * 0.8 + 0.1
    const x = edge === 1 ? 1 : edge === 3 ? 0 : along
    const y = edge === 0 ? 0 : edge === 2 ? 1 : along
    const inward = edge === 0 ? Math.PI / 2 : edge === 1 ? Math.PI : edge === 2 ? -Math.PI / 2 : 0
    out.push(crackFrom(x, y, inward + (hash01(k * 5) - 0.5) * 1.2, k, 4 + Math.floor(hash01(k * 9) * 4)))
  }
  return out
}

export function crackPath(c: WearCrack): string {
  return 'M' + c.points.map(([x, y]) => `${x},${y}`).join(' L')
}
