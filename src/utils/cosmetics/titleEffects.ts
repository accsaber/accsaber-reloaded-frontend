import type {
  TitleBlazeSpec,
  TitleBrewSpec,
  TitleEclipseSpec,
  TitleForgeSpec,
  TitleFrostSpec,
  TitleLanternSpec,
  TitleRuneSpec,
  TitleTransmuteSpec,
} from '@/types/cosmetics/title'
import { lerpHex } from '@/utils/color'
import { eclipsePhase } from '@/utils/cosmetics/eclipseCycle'
import { lanternLevel } from '@/utils/cosmetics/lanternFlicker'
import { withAlpha } from '@/utils/cosmetics/overlayCanvas'
import { pickVariant as pick } from '@/utils/cosmetics/titleAura'
import { sinHash01 } from '@/utils/random'
import { clamp01 } from '@/utils/math'

type Style = Record<string, string>

export const TITLE_INK = '#e9e3d0'
export const TITLE_HIGHLIGHT = '#ffffff'

export function forgeCharStyle(tMs: number, i: number, _n: number, spec: TitleForgeSpec, light: boolean, color: string | undefined): Style {
  const interval = spec.intervalMs ?? 8000
  const stagger = spec.staggerMs ?? 180
  const stamp = spec.stampMs ?? 130
  const cool = spec.coolMs ?? 1100
  const rawMs = 150
  const raw = pick(light, spec.lightRaw, spec.raw, '#46566c')
  const hot = pick(light, spec.lightHot, spec.hot, TITLE_HIGHLIGHT)
  const heat = pick(light, spec.lightHeat, spec.heat, '#ff8a5c')
  let local = (tMs % interval) - (interval * 0.72 + i * stagger)
  if (local < -rawMs) local += interval
  if (local >= -rawMs && local < 0) return { color: raw, textShadow: 'none' }
  if (local >= 0 && local < stamp) return { color: hot, transform: 'translateY(6%)', textShadow: `0 0 0.35em ${hot}` }
  if (local >= stamp && local < stamp + cool) {
    const p = (local - stamp) / cool
    return {
      color: color ? lerpHex(heat, color, p, true) : heat,
      textShadow: p < 0.85 ? `0 0 ${(0.3 * (1 - p)).toFixed(3)}em ${heat}` : 'none',
    }
  }
  return {}
}

export function blazeCharStyle(tMs: number, i: number, n: number, spec: TitleBlazeSpec, light: boolean): Style {
  const interval = spec.intervalMs ?? 8000
  const burn = spec.burnMs ?? 900
  const die = spec.dieMs ?? 700
  const cycle = Math.floor(tMs / interval)
  const local = tMs % interval
  const ember = pick(light, spec.lightEmber, spec.ember, '#ff8a5c')
  const flame = pick(light, spec.lightFlame, spec.flame, '#ffb35c')
  const hot = pick(light, spec.lightHot, spec.hot, '#ffd9a0')
  const origin = Math.floor(sinHash01(cycle + 7) * n)
  const start = interval * 0.55 + Math.abs(i - origin) * (spec.spreadMs ?? 120)
  const extend = sinHash01(cycle * 13 + i) * 500
  let burnAmt = 0
  if (local >= start && local < start + burn + extend) burnAmt = Math.min(1, (local - start) / 140)
  else if (local >= start + burn + extend) burnAmt = Math.max(0, 1 - (local - start - burn - extend) / die)
  if (burnAmt > 0.02) {
    const flick = 0.75 + 0.25 * Math.sin(tMs * 0.021 + i * 5.3)
    const c = Math.min(1, burnAmt * flick)
    return {
      color: lerpHex(ember, c > 0.7 ? hot : flame, c, true),
      transform: `translateY(${(-3.2 * burnAmt * flick).toFixed(2)}%)`,
      textShadow: `0 0 ${(0.45 * c).toFixed(2)}em ${flame}, 0 -0.08em ${(0.28 * c).toFixed(2)}em ${hot}`,
    }
  }
  const breathe = 0.5 + 0.5 * Math.sin(tMs * 0.0012 * (1 + sinHash01(i * 3) * 0.7) + i * 2.1)
  return { textShadow: `0 0 ${(0.1 + 0.16 * breathe).toFixed(2)}em ${flame}` }
}

export function frostCharStyle(tMs: number, i: number, n: number, spec: TitleFrostSpec, light: boolean, color: string | undefined): Style {
  const interval = spec.intervalMs ?? 9000
  const creep = spec.creepMs ?? 1400
  const hold = spec.holdMs ?? 2200
  const thaw = spec.thawMs ?? 1200
  const frost = pick(light, spec.lightFrost, spec.frost, '#e0f2fe')
  const glint = pick(light, spec.lightGlint, spec.glint, TITLE_HIGHLIGHT)
  const cycle = Math.floor(tMs / interval)
  const local = tMs % interval
  const order = sinHash01(cycle * 5 + 2) < 0.5 ? i : n - 1 - i
  const start = interval * 0.3 + (order / Math.max(1, n - 1)) * creep
  let amt = 0
  if (local >= start && local < start + 260) amt = (local - start) / 260
  else if (local >= start + 260 && local < start + creep + hold) amt = 1
  else if (local >= start + creep + hold && local < start + creep + hold + thaw) amt = 1 - (local - start - creep - hold) / thaw
  if (amt <= 0.02) return {}
  const base = color ?? frost
  const shimmer = 0.5 + 0.5 * Math.sin(tMs * 0.011 + i * 2.7)
  return {
    color: lerpHex(base, frost, amt, true),
    textShadow: `0 0 ${(0.12 + 0.22 * amt * shimmer).toFixed(2)}em ${glint}, 0 -0.04em 0 ${lerpHex(base, glint, amt * 0.5, true)}`,
  }
}

export function lanternCharStyle(tMs: number, i: number, _n: number, spec: TitleLanternSpec, light: boolean): Style {
  const dim = pick(light, spec.lightDim, spec.dim, '#7a3a10')
  const lit = pick(light, spec.lightLit, spec.lit, '#ffb347')
  const glow = pick(light, spec.lightGlow, spec.glow, '#e8781e')
  const level = lanternLevel(tMs / 1000, i * 0.9, spec)
  return {
    color: lerpHex(dim, lit, clamp01((level - 0.2) / 0.8)),
    textShadow: `0 0 ${(2 + 10 * level).toFixed(1)}px ${withAlpha(glow, 0.75 * level)}`,
  }
}

export function eclipseCharStyle(tMs: number, i: number, n: number, spec: TitleEclipseSpec, light: boolean, color: string | undefined): Style {
  const ph = eclipsePhase(tMs / 1000)
  const dark = spec.dark
  const corona = pick(light, spec.lightCorona, spec.corona, spec.corona)
  const bead = spec.bead
  const base = color ?? corona
  const ring = ph.flash > 0.5 && i === Math.floor(sinHash01(ph.cycle * 17 + 3) * Math.max(1, n)) ? (ph.flash - 0.5) * 2 : 0
  const beads = ph.flash > 0 && ph.flash <= 0.5 && i % 2 === 0 ? ph.flash * 2 : 0
  const shadows: string[] = []
  if (ph.tot > 0) shadows.push(`0 0 ${(spec.annular ? 0.08 + 0.1 * ph.tot : 0.12 + 0.3 * ph.tot).toFixed(2)}em ${withAlpha(corona, 0.85 * ph.tot)}`)
  if (ring > 0) shadows.push(`0 0 ${(0.6 * ring).toFixed(2)}em ${withAlpha(bead, ring)}`, `0 0 0.15em ${withAlpha(bead, ring)}`)
  if (beads > 0) shadows.push(`0.06em -0.08em 0 ${withAlpha(bead, beads)}`)
  const out: Style = {
    color: ring > 0 ? lerpHex(dark, bead, ring) : lerpHex(base, dark, ph.cover),
    textShadow: shadows.length ? shadows.join(', ') : 'none',
  }
  if (spec.annular && ph.tot > 0) {
    out.WebkitTextStroke = `${(0.07 * ph.tot).toFixed(3)}em ${withAlpha(corona, ph.tot)}`
    out.paintOrder = 'stroke fill'
  }
  return out
}

export function transmuteCharStyle(tMs: number, i: number, _n: number, spec: TitleTransmuteSpec, light: boolean, color: string | undefined): Style {
  const interval = spec.intervalMs ?? 7000
  const lead = pick(light, spec.lightLead, spec.lead, '#6b7280')
  const gold = pick(light, spec.lightGold, spec.gold, color ?? '#f2c94c')
  const glint = pick(light, spec.lightGlint, spec.glint, '#fff7dd')
  const cycle = Math.floor(tMs / interval)
  const local = tMs % interval
  const failed = sinHash01(cycle * 19 + i * 7) < (spec.failChance ?? 0.2)
  const dropAt = interval * 0.25
  const start = interval * 0.4 + i * (spec.stepMs ?? 220)
  if (local < dropAt) return {}
  if (local < dropAt + 300) return { color: lerpHex(gold, lead, (local - dropAt) / 300, true) }
  if (local < start || failed) return { color: lead, textShadow: 'none' }
  const p = Math.min(1, (local - start) / 320)
  return {
    color: lerpHex(lead, gold, p, true),
    textShadow: p < 1 ? `0 0 ${(0.4 * Math.sin(p * Math.PI)).toFixed(2)}em ${glint}` : 'none',
  }
}

const RUNE_GLYPHS = ['ᚠ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ', 'ᚷ', 'ᚺ', 'ᛁ', 'ᛃ', 'ᛈ', 'ᛉ', 'ᛊ', 'ᛏ', 'ᛒ', 'ᛖ', 'ᛗ', 'ᛚ', 'ᛞ', 'ᛟ']

export function runeActive(tMs: number, i: number, text: string, spec: TitleRuneSpec): boolean {
  const interval = spec.intervalMs ?? 2600
  const cycle = Math.floor(tMs / interval)
  const local = tMs % interval
  const victim = Math.floor(sinHash01(cycle * 23 + 5) * text.length)
  return i === victim && local >= interval * 0.5 && local < interval * 0.5 + (spec.holdMs ?? 320) && text[i] !== ' '
}

export function runeCharAt(tMs: number, i: number, spec: TitleRuneSpec): string {
  const cycle = Math.floor(tMs / (spec.intervalMs ?? 2600))
  return RUNE_GLYPHS[Math.floor(sinHash01(cycle * 29 + i) * RUNE_GLYPHS.length)]
}

export function runeCharStyle(spec: TitleRuneSpec, light: boolean): Style {
  const color = pick(light, spec.lightColor, spec.color, '#e9d5ff')
  return { color, textShadow: `0 0 0.35em ${color}` }
}

export interface BrewSplash {
  x: number
  at: number
}

function brewBob(tMs: number, i: number, n: number, spec: TitleBrewSpec, splashes: BrewSplash[], still: boolean): { bob: number; rot: number } {
  if (still) return { bob: 0, rot: 0 }
  const t = tMs / 1000
  const amp = spec.bobEm ?? 0.07
  let bob = Math.sin(t * 2.1 + i * 0.9) * amp
  for (const sp of splashes) {
    const age = t - sp.at
    if (age < 0 || age > 1.2) continue
    const near = Math.max(0, 1 - Math.abs((i + 0.5) / n - sp.x) * 4)
    bob -= near * Math.exp(-age * 3) * Math.sin(age * 14) * amp * 2.4
  }
  return { bob, rot: Math.sin(t * 1.3 + i * 1.7) * 2.5 }
}

export function brewCharStyle(
  tMs: number,
  i: number,
  n: number,
  spec: TitleBrewSpec,
  light: boolean,
  base: string,
  brew: { liquid: string; splashes: BrewSplash[]; still: boolean },
): Style {
  const { bob, rot } = brewBob(tMs, i, n, spec, brew.splashes, brew.still)
  const first = spec.ingredients[0]
  const sub = lerpHex(base, brew.liquid || pick(light, first?.lightColor, first?.color, base), 0.32)
  const waterline = (((spec.surface ?? 0.66) - bob) * 100).toFixed(1)
  return {
    display: 'inline-block',
    transform: `translateY(${bob.toFixed(3)}em) rotate(${rot.toFixed(2)}deg)`,
    background: `linear-gradient(to bottom, ${base} 0 ${waterline}%, ${sub} ${waterline}% 100%)`,
    '-webkit-background-clip': 'text',
    'background-clip': 'text',
    color: 'transparent',
  }
}
