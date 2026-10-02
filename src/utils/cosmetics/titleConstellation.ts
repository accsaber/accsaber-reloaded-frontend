import type { TitleConstellationSpec } from '@/types/api/items'

export const CONSTELLATION_STAGGER_MS = 110
export const CONSTELLATION_FLY_MS = 1000
export const CONSTELLATION_RELEASE_MS = 1600
export const CONSTELLATION_DIM_MS = 900

export interface ConstellationClock {
  cycle: number
  local: number
  period: number
}

export function constellationClock(tMs: number, spec: TitleConstellationSpec | undefined): ConstellationClock {
  const period = spec?.periodMs ?? 11000
  return { cycle: Math.floor(tMs / period), local: tMs % period, period }
}

export function easeInOut(p: number): number {
  const c = Math.min(1, Math.max(0, p))
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2
}

export function letterFlight(local: number, i: number): number {
  return easeInOut((local - i * CONSTELLATION_STAGGER_MS) / CONSTELLATION_FLY_MS)
}

export function letterRelease(clock: ConstellationClock, i: number): number {
  const start = clock.period - CONSTELLATION_DIM_MS - CONSTELLATION_RELEASE_MS - 700
  return easeInOut((clock.local - start - i * CONSTELLATION_STAGGER_MS * 0.5) / CONSTELLATION_RELEASE_MS)
}

export function letterPresence(tMs: number, i: number, spec: TitleConstellationSpec): number {
  const clock = constellationClock(tMs, spec)
  const dim = spec.dimOpacity ?? 0.18
  const fade = clock.local - (clock.period - CONSTELLATION_DIM_MS)
  if (fade >= 0) return 1 - (1 - dim) * easeInOut(fade / CONSTELLATION_DIM_MS)
  return dim + (1 - dim) * letterFlight(clock.local, i)
}

export function constellationCharStyle(tMs: number, i: number, _n: number, spec: TitleConstellationSpec): Record<string, string> {
  return { opacity: letterPresence(tMs, i, spec).toFixed(3) }
}
