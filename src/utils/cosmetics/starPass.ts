import type { TitleStarlitSpec } from '@/types/cosmetics/title'
import { lerpHex } from '@/utils/color'
import { pickVariant as pick } from '@/utils/cosmetics/titleAura'
import { TITLE_HIGHLIGHT } from '@/utils/cosmetics/titleEffects'
import { clamp01, smoothstep01 } from '@/utils/math'
import { sinHash01 } from '@/utils/random'

type Style = Record<string, string>

export interface StarPass {
  x: number
  u: number
  dir: number
  cycle: number
}

const OVERSHOOT = 0.18
const AFTERGLOW = 0.42

export function starPass(nowMs: number, spec: TitleStarlitSpec | undefined): StarPass | null {
  const interval = spec?.intervalMs ?? 6500
  const travel = spec?.travelMs ?? 1500
  const cycle = Math.floor(nowMs / interval)
  const u = (nowMs - cycle * interval) / travel
  if (u >= 1 + AFTERGLOW) return null
  const dir = sinHash01(cycle * 3.7) < 0.5 ? 1 : -1
  const span = -OVERSHOOT + (1 + OVERSHOOT * 2) * smoothstep01(u)
  return { x: dir > 0 ? span : 1 - span, u, dir, cycle }
}

export function starlitCharStyle(_tMs: number, i: number, n: number, spec: TitleStarlitSpec, light: boolean, base: string): Style {
  const now = performance.now()
  const flash = pick(light, spec.lightFlash, spec.flash, TITLE_HIGHLIGHT)
  const tint = pick(light, spec.lightTint, spec.tint, base)
  const breathe = 0.5 + 0.5 * Math.sin(now * 0.0008 + i * 0.6)
  const rest = lerpHex(base, tint, 0.3 * breathe, true)
  const drift = now * ((Math.PI * 2) / (spec.floatMs ?? 3400)) + i * 1.3
  const bob = Math.sin(drift) * (spec.floatEm ?? 0.09)
  const tilt = Math.sin(drift * 0.7 + 1) * 3
  const float = (lift: number) => `translateY(${(bob - lift).toFixed(3)}em) rotate(${tilt.toFixed(2)}deg)`
  const ink = pick(light, spec.lightInk, spec.ink)
  const halo = ink ? `0 0 0.05em ${ink}, 0 0 0.1em ${ink}, 0 0.02em 0.16em ${ink}` : 'none'
  const pass = starPass(now, spec)
  if (!pass) return { color: rest, textShadow: halo, transform: float(0) }
  const behind = (pass.x - (i + 0.5) / n) * pass.dir + Math.max(0, pass.u - 1)
  const lit = behind < 0 ? clamp01(1 + behind / 0.06) : clamp01(1 - behind / AFTERGLOW) ** 2
  if (lit <= 0.01) return { color: rest, textShadow: halo, transform: float(0) }
  return {
    color: lerpHex(rest, flash, lit, true),
    textShadow: `0 0 ${(0.35 * lit).toFixed(2)}em ${flash}${ink ? `, ${halo}` : ''}`,
    transform: float(0.07 * lit),
  }
}
