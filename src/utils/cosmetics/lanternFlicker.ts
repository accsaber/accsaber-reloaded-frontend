import { flickerNoise } from '@/utils/cosmetics/canvasShapes'
import { hash01 } from '@/utils/random'

export interface LanternTiming {
  gutterEveryS?: number
  gutterS?: number
}

export function lanternLevel(tSec: number, phase: number, timing: LanternTiming = {}): number {
  const every = timing.gutterEveryS ?? 11
  const gutter = timing.gutterS ?? 0.7
  const flick = 0.72 + 0.28 * flickerNoise(tSec * 1.3 + phase * 0.37, 1.1)
  const cycle = Math.floor(tSec / every)
  const at = (cycle + 0.35 + hash01(cycle * 7) * 0.5) * every
  const d = tSec - at
  if (d < 0 || d > gutter) return flick
  const u = d / gutter
  const dip = u < 0.3 ? 1 - (u / 0.3) * 0.75 : 0.25 + ((u - 0.3) / 0.7) * 0.75
  return flick * dip
}
