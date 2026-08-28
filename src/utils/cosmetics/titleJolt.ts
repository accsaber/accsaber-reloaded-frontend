import type { TitleJoltSpec } from '@/types/api/items'

export interface JoltFrame {
  scale: number
  rotate: number
  dx: number
  dy: number
  spacing: number
  flash: number
  rings: number[]
  scream: boolean
  done: boolean
}

export function joltDurations(spec: TitleJoltSpec): { windup: number; hold: number; recoil: number } {
  return { windup: spec.windupMs ?? 260, hold: spec.holdMs ?? 520, recoil: spec.recoilMs ?? 340 }
}

function windupFrame(e: number, windup: number): JoltFrame {
  const p = e / windup
  return {
    scale: 1 - 0.1 * p,
    rotate: Math.sin(e * 0.09) * 1.2 * p,
    dx: Math.sin(e * 0.13) * 0.012 * p,
    dy: 0.05 * p,
    spacing: -0.02 * p,
    flash: 0,
    rings: [],
    scream: false,
    done: false,
  }
}

function screamFrame(e: number, hold: number, pop: number, rings: boolean): JoltFrame {
  const p = e / hold
  const rs = rings ? [p / 0.85, (p - 0.14) / 0.85].filter((r) => r > 0 && r < 1) : []
  return {
    scale: pop * (1 + 0.12 * Math.exp(-p * 6) * Math.cos(p * 30)),
    rotate: Math.sin(e * 0.11) * 6 * (1 - p * 0.5),
    dx: Math.sin(e * 0.17) * 0.06,
    dy: -0.08 + Math.cos(e * 0.13) * 0.04,
    spacing: 0.1,
    flash: 0.6 * (1 - p),
    rings: rs,
    scream: true,
    done: false,
  }
}

function recoilFrame(e: number, recoil: number, pop: number): JoltFrame {
  const p = e / recoil
  return {
    scale: 1 + (pop - 1) * Math.exp(-4 * p) * Math.cos(p * 7),
    rotate: 0,
    dx: 0,
    dy: 0,
    spacing: 0.1 * Math.max(0, 1 - p * 2),
    flash: 0,
    rings: [],
    scream: p < 0.35,
    done: false,
  }
}

export function joltFrame(elapsedMs: number, spec: TitleJoltSpec): JoltFrame {
  const { windup, hold, recoil } = joltDurations(spec)
  const pop = spec.scale ?? 2.1
  if (elapsedMs < windup) return windupFrame(elapsedMs, windup)
  if (elapsedMs < windup + hold) return screamFrame(elapsedMs - windup, hold, pop, spec.rings !== false)
  if (elapsedMs < windup + hold + recoil) return recoilFrame(elapsedMs - windup - hold, recoil, pop)
  return { scale: 1, rotate: 0, dx: 0, dy: 0, spacing: 0, flash: 0, rings: [], scream: false, done: true }
}
