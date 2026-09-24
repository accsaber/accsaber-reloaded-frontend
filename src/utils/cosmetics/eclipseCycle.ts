export const ECLIPSE_PERIOD = 18
export const ECLIPSE_DAY_END = 5
export const ECLIPSE_PARTIAL_END = 8
export const ECLIPSE_TOTAL_END = 15
export const ECLIPSE_SUN: [number, number] = [50, 3.4]
export const ECLIPSE_SUN_R = 2.9

export interface EclipsePhase {
  cycle: number
  c: number
  cover: number
  sunX: number
  moonX: number
  tot: number
  out: number
  flash: number
}

function eclipseSunX(c: number, forward: boolean): number {
  const u = c / ECLIPSE_PERIOD
  return forward ? 22 + 56 * u : 78 - 56 * u
}

function clamp01(u: number): number {
  return Math.min(1, Math.max(0, u))
}

export function eclipsePhase(t: number): EclipsePhase {
  const c = t % ECLIPSE_PERIOD
  const cycle = Math.floor(t / ECLIPSE_PERIOD)
  const forward = cycle % 2 === 0
  const sunX = eclipseSunX(c, forward)
  const dir = forward ? 1 : -1
  let cover = 0
  let moonX = sunX - dir * ECLIPSE_SUN_R * 2.6
  if (c >= ECLIPSE_DAY_END && c < ECLIPSE_PARTIAL_END) {
    cover = (c - ECLIPSE_DAY_END) / (ECLIPSE_PARTIAL_END - ECLIPSE_DAY_END)
    moonX = sunX - dir * (1 - cover) * ECLIPSE_SUN_R * 2.6
  } else if (c >= ECLIPSE_PARTIAL_END && c < ECLIPSE_TOTAL_END) {
    cover = 1
    moonX = sunX
  } else if (c >= ECLIPSE_TOTAL_END) {
    cover = 1 - (c - ECLIPSE_TOTAL_END) / (ECLIPSE_PERIOD - ECLIPSE_TOTAL_END)
    moonX = sunX + dir * (1 - cover) * ECLIPSE_SUN_R * 2.6
  }
  const tot = clamp01(Math.min((c - ECLIPSE_PARTIAL_END + 0.4) / 0.6, (ECLIPSE_TOTAL_END + 0.2 - c) / 0.6))
  const out = clamp01(Math.min((c - ECLIPSE_PARTIAL_END) / 1.6, (ECLIPSE_TOTAL_END - 0.3 - c) / 1.2))
  const ring = Math.max(0, 1 - Math.abs(c - ECLIPSE_TOTAL_END) / 0.45)
  const bead = Math.max(0, 1 - Math.abs(c - ECLIPSE_PARTIAL_END) / 0.3) * 0.5
  const flash = Math.max(ring * ring, bead)
  return { cycle, c, cover, sunX, moonX, tot, out, flash }
}
