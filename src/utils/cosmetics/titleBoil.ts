import type { TitleBoilSpec } from '@/types/api/items'
import { hash01 } from '@/utils/random'

const CLOCKWISE: [number, number][] = [[0, -1], [1, 0], [0, 1], [-1, 0]]

export function boilStep(nowMs: number, spec: TitleBoilSpec | undefined): number {
  return Math.floor(nowMs / (spec?.stepMs ?? 200))
}

export function boilOffsetEm(step: number, spec: TitleBoilSpec | undefined): [number, number] {
  const [dx, dy] = CLOCKWISE[step % CLOCKWISE.length]
  const amp = spec?.offsetEm ?? 0.05
  return [dx * amp, dy * amp]
}

export function boilCharStyle(step: number, i: number, spec: TitleBoilSpec, base: string): Record<string, string> {
  const [dx, dy] = boilOffsetEm(step, spec)
  const seed = (step % CLOCKWISE.length) * 131 + i * 17
  const tweakEm = spec.tweakEm ?? 0.03
  const x = dx + (hash01(seed) - 0.5) * 2 * tweakEm
  const y = dy + (hash01(seed + 1) - 0.5) * 2 * tweakEm
  const rot = (hash01(seed + 2) - 0.5) * 2 * (spec.tweakDeg ?? 4)
  return {
    transform: `translate(${x.toFixed(3)}em, ${y.toFixed(3)}em) rotate(${rot.toFixed(2)}deg)`,
    textShadow: `0 0 0.06em ${base}`,
  }
}
