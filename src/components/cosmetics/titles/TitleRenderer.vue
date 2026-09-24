<script setup lang="ts">
import TitleAura from '@/components/cosmetics/titles/TitleAura.vue'
import TitleBrewLayer from '@/components/cosmetics/titles/TitleBrewLayer.vue'
import { useReducedMotion } from '@/composables/useReducedMotion'
import { useThemeBase } from '@/composables/useThemeBase'
import { useTimeline } from '@/composables/useTimeline'
import type {
  TitleAscensionAuraSpec,
  TitleBlazeSpec,
  TitleBrewSpec,
  TitleEclipseSpec,
  TitleForgeSpec,
  TitleFrostSpec,
  TitleLanternSpec,
  TitleRuneSpec,
  TitleStateValue,
  TitleTransmuteSpec,
  TitleValue,
} from '@/types/api/items'
import { darken, lerpHex } from '@/utils/color'
import { win } from '@/utils/cosmetics/canvasShapes'
import { eclipsePhase } from '@/utils/cosmetics/eclipseCycle'
import { lanternLevel } from '@/utils/cosmetics/lanternFlicker'
import { withAlpha } from '@/utils/cosmetics/overlayCanvas'
import { pickVariant, type TitleAuraLinks } from '@/utils/cosmetics/titleAura'
import { hauntCharStyle } from '@/utils/cosmetics/titleHaunt'
import { joltDurations, joltFrame } from '@/utils/cosmetics/titleJolt'
import { ascentCharStyle, excavateCharStyle, hammerCharStyle, metronomeCharStyle, punchCharStyle, questCharStyle, questMarkers, reelCharAt, reelCharStyle, restartCharStyle, scalesCharStyle, scrawlCharStyle, sliceCharStyle, sproutCharStyle, tickCharStyle } from '@/utils/cosmetics/titleMilestones'
import { bleedCharStyle, devourCharStyle, flareCharStyle, galaxyCharStyle, gustCharStyle, pixieCharStyle, quakeCharStyle, rippleCharStyle, searCharStyle, shockCharStyle } from '@/utils/cosmetics/titleSchools'
import {
  gradientToCss,
  interpolateTitleState,
  isAnimated,
  lerpColor,
  pickInterpolatedState,
} from '@/utils/items'
import { randBetween as rand, sinHash01 } from '@/utils/random'
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  value: TitleValue
}>()

type CharStyle = Record<string, string>

type GlyphKey =
  | 'brew' | 'sprout' | 'ascent' | 'slice' | 'tick' | 'metronome' | 'scrawl' | 'reel' | 'restart'
  | 'punch' | 'hammer' | 'excavate' | 'quest' | 'scales'
  | 'quake' | 'gust' | 'ripple' | 'pixie' | 'bleed' | 'galaxy' | 'flare' | 'devour' | 'shock' | 'sear'
  | 'forge' | 'blaze' | 'haunt' | 'frost' | 'lantern' | 'eclipse' | 'transmute' | 'rune'

type GlyphFx<K extends GlyphKey> = (
  tMs: number,
  i: number,
  n: number,
  spec: NonNullable<TitleValue[K]>,
  light: boolean,
  base: string,
) => CharStyle

type GlyphEffect = (value: TitleValue, reduced: boolean) => ((i: number) => CharStyle) | null

const INK = '#e9e3d0'

const reducedMotion = useReducedMotion()

function motionSpec<T extends { enabled: boolean }>(spec: T | undefined): T | null {
  return spec?.enabled && !reducedMotion.value ? spec : null
}

const isPixelFont = computed(() => props.value.font === 'pixel_8bit')

const themeBase = useThemeBase()
const isLightBase = computed(() => themeBase.value === 'light')

function tone<T>(lightValue: T | undefined, value: T | undefined, fallback: T): T {
  return pickVariant(isLightBase.value, lightValue, value, fallback)
}

const effectiveStates = computed<TitleStateValue[]>(() => {
  if (!isLightBase.value) return props.value.states
  return props.value.states.map((s) => ({
    ...s,
    color: s.lightColor ?? s.color,
    gradient: s.lightGradient ?? s.gradient,
  }))
})

function forgeCharStyle(tNow: number, i: number, _n: number, spec: TitleForgeSpec): CharStyle {
  const interval = spec.intervalMs ?? 8000
  const stagger = spec.staggerMs ?? 180
  const stamp = spec.stampMs ?? 130
  const cool = spec.coolMs ?? 1100
  const rawMs = 150
  const raw = tone(spec.lightRaw, spec.raw, '#46566c')
  const hot = tone(spec.lightHot, spec.hot, '#ffffff')
  const heat = tone(spec.lightHeat, spec.heat, '#ff8a5c')
  const base = state.value.color
  let local = (tNow % interval) - (interval * 0.72 + i * stagger)
  if (local < -rawMs) local += interval
  if (local >= -rawMs && local < 0) return { color: raw, textShadow: 'none' }
  if (local >= 0 && local < stamp) return { color: hot, transform: 'translateY(6%)', textShadow: `0 0 0.35em ${hot}` }
  if (local >= stamp && local < stamp + cool) {
    const p = (local - stamp) / cool
    return {
      color: base ? lerpColor(heat, base, p) : heat,
      textShadow: p < 0.85 ? `0 0 ${(0.3 * (1 - p)).toFixed(3)}em ${heat}` : 'none',
    }
  }
  return {}
}

function blazeCharStyle(tNow: number, i: number, n: number, spec: TitleBlazeSpec): CharStyle {
  const interval = spec.intervalMs ?? 8000
  const burn = spec.burnMs ?? 900
  const die = spec.dieMs ?? 700
  const cycle = Math.floor(tNow / interval)
  const local = tNow % interval
  const ember = tone(spec.lightEmber, spec.ember, '#ff8a5c')
  const flame = tone(spec.lightFlame, spec.flame, '#ffb35c')
  const hot = tone(spec.lightHot, spec.hot, '#ffd9a0')
  const origin = Math.floor(sinHash01(cycle + 7) * n)
  const start = interval * 0.55 + Math.abs(i - origin) * (spec.spreadMs ?? 120)
  const extend = sinHash01(cycle * 13 + i) * 500
  let burnAmt = 0
  if (local >= start && local < start + burn + extend) burnAmt = Math.min(1, (local - start) / 140)
  else if (local >= start + burn + extend) burnAmt = Math.max(0, 1 - (local - start - burn - extend) / die)
  if (burnAmt > 0.02) {
    const flick = 0.75 + 0.25 * Math.sin(tNow * 0.021 + i * 5.3)
    const c = Math.min(1, burnAmt * flick)
    return {
      color: lerpColor(ember, c > 0.7 ? hot : flame, c),
      transform: `translateY(${(-3.2 * burnAmt * flick).toFixed(2)}%)`,
      textShadow: `0 0 ${(0.45 * c).toFixed(2)}em ${flame}, 0 -0.08em ${(0.28 * c).toFixed(2)}em ${hot}`,
    }
  }
  const breathe = 0.5 + 0.5 * Math.sin(tNow * 0.0012 * (1 + sinHash01(i * 3) * 0.7) + i * 2.1)
  return { textShadow: `0 0 ${(0.1 + 0.16 * breathe).toFixed(2)}em ${flame}` }
}

function frostCharStyle(tNow: number, i: number, n: number, spec: TitleFrostSpec): CharStyle {
  const interval = spec.intervalMs ?? 9000
  const creep = spec.creepMs ?? 1400
  const hold = spec.holdMs ?? 2200
  const thaw = spec.thawMs ?? 1200
  const frost = tone(spec.lightFrost, spec.frost, '#e0f2fe')
  const glint = tone(spec.lightGlint, spec.glint, '#ffffff')
  const cycle = Math.floor(tNow / interval)
  const local = tNow % interval
  const order = sinHash01(cycle * 5 + 2) < 0.5 ? i : n - 1 - i
  const start = interval * 0.3 + (order / Math.max(1, n - 1)) * creep
  let amt = 0
  if (local >= start && local < start + 260) amt = (local - start) / 260
  else if (local >= start + 260 && local < start + creep + hold) amt = 1
  else if (local >= start + creep + hold && local < start + creep + hold + thaw) amt = 1 - (local - start - creep - hold) / thaw
  if (amt <= 0.02) return {}
  const base = state.value.color ?? frost
  const shimmer = 0.5 + 0.5 * Math.sin(tNow * 0.011 + i * 2.7)
  return {
    color: lerpColor(base, frost, amt),
    textShadow: `0 0 ${(0.12 + 0.22 * amt * shimmer).toFixed(2)}em ${glint}, 0 -0.04em 0 ${lerpColor(base, glint, amt * 0.5)}`,
  }
}

function lanternCharStyle(tNow: number, i: number, _n: number, spec: TitleLanternSpec): CharStyle {
  const dim = tone(spec.lightDim, spec.dim, '#7a3a10')
  const lit = tone(spec.lightLit, spec.lit, '#ffb347')
  const glow = tone(spec.lightGlow, spec.glow, '#e8781e')
  const level = lanternLevel(tNow / 1000, i * 0.9, spec)
  return {
    color: lerpHex(dim, lit, Math.min(1, Math.max(0, (level - 0.2) / 0.8))),
    textShadow: `0 0 ${(2 + 10 * level).toFixed(1)}px ${withAlpha(glow, 0.75 * level)}`,
  }
}

function eclipseCharStyle(tNow: number, i: number, n: number, spec: TitleEclipseSpec): CharStyle {
  const t = tNow / 1000
  const ph = eclipsePhase(t)
  const dark = spec.dark
  const corona = tone(spec.lightCorona, spec.corona, spec.corona)
  const bead = spec.bead
  const base = state.value.color ?? corona
  const ring = ph.flash > 0.5 && i === Math.floor(sinHash01(ph.cycle * 17 + 3) * Math.max(1, n)) ? (ph.flash - 0.5) * 2 : 0
  const beads = ph.flash > 0 && ph.flash <= 0.5 && i % 2 === 0 ? ph.flash * 2 : 0
  const shadows: string[] = []
  if (ph.tot > 0) shadows.push(`0 0 ${(spec.annular ? 0.08 + 0.1 * ph.tot : 0.12 + 0.3 * ph.tot).toFixed(2)}em ${withAlpha(corona, 0.85 * ph.tot)}`)
  if (ring > 0) shadows.push(`0 0 ${(0.6 * ring).toFixed(2)}em ${withAlpha(bead, ring)}`, `0 0 0.15em ${withAlpha(bead, ring)}`)
  if (beads > 0) shadows.push(`0.06em -0.08em 0 ${withAlpha(bead, beads)}`)
  const out: CharStyle = {
    color: ring > 0 ? lerpHex(dark, bead, ring) : lerpHex(base, dark, ph.cover),
    textShadow: shadows.length ? shadows.join(', ') : 'none',
  }
  if (spec.annular && ph.tot > 0) {
    out.WebkitTextStroke = `${(0.07 * ph.tot).toFixed(3)}em ${withAlpha(corona, ph.tot)}`
    out.paintOrder = 'stroke fill'
  }
  return out
}

function transmuteCharStyle(tNow: number, i: number, _n: number, spec: TitleTransmuteSpec): CharStyle {
  const interval = spec.intervalMs ?? 7000
  const lead = tone(spec.lightLead, spec.lead, '#6b7280')
  const gold = tone(spec.lightGold, spec.gold, state.value.color ?? '#f2c94c')
  const glint = tone(spec.lightGlint, spec.glint, '#fff7dd')
  const cycle = Math.floor(tNow / interval)
  const local = tNow % interval
  const failed = sinHash01(cycle * 19 + i * 7) < (spec.failChance ?? 0.2)
  const dropAt = interval * 0.25
  const start = interval * 0.4 + i * (spec.stepMs ?? 220)
  if (local < dropAt) return {}
  if (local < dropAt + 300) return { color: lerpColor(gold, lead, (local - dropAt) / 300) }
  if (local < start || failed) return { color: lead, textShadow: 'none' }
  const p = Math.min(1, (local - start) / 320)
  return {
    color: lerpColor(lead, gold, p),
    textShadow: p < 1 ? `0 0 ${(0.4 * Math.sin(p * Math.PI)).toFixed(2)}em ${glint}` : 'none',
  }
}

const RUNE_GLYPHS = ['ᚠ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ', 'ᚷ', 'ᚺ', 'ᛁ', 'ᛃ', 'ᛈ', 'ᛉ', 'ᛊ', 'ᛏ', 'ᛒ', 'ᛖ', 'ᛗ', 'ᛚ', 'ᛞ', 'ᛟ']

const runeSpec = computed(() => motionSpec(props.value.rune))

function runeActive(i: number): boolean {
  const spec = runeSpec.value
  if (!spec) return false
  const interval = spec.intervalMs ?? 2600
  const cycle = Math.floor(tMs.value / interval)
  const local = tMs.value % interval
  const victim = Math.floor(sinHash01(cycle * 23 + 5) * props.value.text.length)
  return i === victim && local >= interval * 0.5 && local < interval * 0.5 + (spec.holdMs ?? 320) && props.value.text[i] !== ' '
}

function runeCharStyle(_t: number, i: number, _n: number, spec: TitleRuneSpec): CharStyle {
  if (!runeActive(i)) return {}
  const color = tone(spec.lightColor, spec.color, '#e9d5ff')
  return { color, textShadow: `0 0 0.35em ${color}` }
}

const brewLiquid = ref('')
const brewSplashes = ref<{ x: number; at: number }[]>([])

function onBrewSplash(x: number): void {
  const t = tMs.value / 1000
  brewSplashes.value = [...brewSplashes.value.filter((sp) => t - sp.at < 1.5), { x, at: t }]
}

function brewBob(tNow: number, i: number, n: number, spec: TitleBrewSpec): { bob: number; rot: number } {
  if (reducedMotion.value) return { bob: 0, rot: 0 }
  const t = tNow / 1000
  const amp = spec.bobEm ?? 0.07
  let bob = Math.sin(t * 2.1 + i * 0.9) * amp
  for (const sp of brewSplashes.value) {
    const age = t - sp.at
    if (age < 0 || age > 1.2) continue
    const near = Math.max(0, 1 - Math.abs((i + 0.5) / n - sp.x) * 4)
    bob -= near * Math.exp(-age * 3) * Math.sin(age * 14) * amp * 2.4
  }
  return { bob, rot: Math.sin(t * 1.3 + i * 1.7) * 2.5 }
}

function brewCharStyle(tNow: number, i: number, n: number, spec: TitleBrewSpec): CharStyle {
  const { bob, rot } = brewBob(tNow, i, n, spec)
  const first = spec.ingredients[0]
  const top = state.value.color ?? INK
  const sub = lerpHex(top, brewLiquid.value || tone(first?.lightColor, first?.color, top), 0.32)
  const waterline = (((spec.surface ?? 0.66) - bob) * 100).toFixed(1)
  return {
    display: 'inline-block',
    transform: `translateY(${bob.toFixed(3)}em) rotate(${rot.toFixed(2)}deg)`,
    background: `linear-gradient(to bottom, ${top} 0 ${waterline}%, ${sub} ${waterline}% 100%)`,
    '-webkit-background-clip': 'text',
    'background-clip': 'text',
    color: 'transparent',
  }
}

function liftCharStyle(spec: TitleAscensionAuraSpec, i: number): CharStyle {
  const interval = (spec.intervalS ?? 7) * 1000
  const surge = win((tMs.value % interval) / interval, 0.74, 0.95)
  if (surge < 0) return {}
  const p = Math.max(0, Math.min(1, surge * 1.35 - i * 0.055))
  const pulse = Math.sin(Math.PI * p)
  if (pulse <= 0.02) return {}
  const shine = tone(spec.lightShine, spec.shine, '#ffffff')
  const out: CharStyle = {
    transform: `translateY(${(-0.3 * pulse).toFixed(3)}em)`,
    textShadow: `0 0 ${(0.35 * pulse).toFixed(2)}em ${shine}`,
  }
  if (pulse > 0.55) out.color = shine
  return out
}

function glyph<K extends GlyphKey>(key: K, fx: GlyphFx<K>, still = false): GlyphEffect {
  return (value, reduced) => {
    const spec = value[key]
    if (!spec || !spec.enabled || (reduced && !still)) return null
    return (i) => fx(tMs.value, i, value.text.length, spec, isLightBase.value, state.value.color ?? INK)
  }
}

const liftGlyph: GlyphEffect = (value, reduced) => {
  const a = value.aura
  return a?.type === 'ascension' && a.enabled && a.lift && !reduced ? (i) => liftCharStyle(a, i) : null
}

const GLYPH_EFFECTS: GlyphEffect[] = [
  glyph('brew', brewCharStyle, true),
  glyph('sprout', sproutCharStyle),
  glyph('ascent', ascentCharStyle),
  glyph('slice', sliceCharStyle),
  glyph('tick', tickCharStyle),
  glyph('metronome', metronomeCharStyle),
  glyph('scrawl', scrawlCharStyle),
  glyph('reel', reelCharStyle),
  glyph('restart', restartCharStyle),
  glyph('punch', punchCharStyle),
  glyph('hammer', hammerCharStyle),
  glyph('excavate', excavateCharStyle),
  glyph('quest', questCharStyle),
  glyph('scales', (t, i, n, spec, light) => scalesCharStyle(reducedMotion.value ? 0 : t, i, n, spec, light), true),
  glyph('quake', quakeCharStyle),
  glyph('gust', gustCharStyle),
  glyph('ripple', rippleCharStyle),
  glyph('pixie', pixieCharStyle),
  glyph('bleed', bleedCharStyle),
  glyph('galaxy', galaxyCharStyle),
  glyph('flare', flareCharStyle),
  glyph('devour', devourCharStyle),
  glyph('shock', shockCharStyle),
  glyph('sear', searCharStyle),
  glyph('forge', forgeCharStyle),
  glyph('blaze', blazeCharStyle),
  glyph('haunt', hauntCharStyle),
  glyph('frost', frostCharStyle),
  glyph('lantern', lanternCharStyle),
  glyph('eclipse', eclipseCharStyle),
  glyph('transmute', transmuteCharStyle),
  glyph('rune', runeCharStyle),
  liftGlyph,
]

const activeGlyph = computed(() => {
  for (const effect of GLYPH_EFFECTS) {
    const style = effect(props.value, reducedMotion.value)
    if (style) return style
  }
  return null
})

const glyphChars = computed<string[] | null>(() => (activeGlyph.value ? props.value.text.split('') : null))

function glyphStyle(i: number): CharStyle {
  return activeGlyph.value?.(i) ?? {}
}

const reelSpec = computed(() => motionSpec(props.value.reel))
const questSpec = computed(() => motionSpec(props.value.quest))

function glyphText(ch: string, i: number): string {
  if (reelSpec.value) return reelCharAt(tMs.value, i, ch, reelSpec.value)
  if (!runeActive(i)) return ch
  const cycle = Math.floor(tMs.value / (runeSpec.value?.intervalMs ?? 2600))
  return RUNE_GLYPHS[Math.floor(sinHash01(cycle * 29 + i) * RUNE_GLYPHS.length)]
}

const activeQuestMarkers = computed(() =>
  questSpec.value ? questMarkers(tMs.value, props.value.text.length, questSpec.value, isLightBase.value) : [],
)

const brewSpec = computed(() => (props.value.brew?.enabled ? props.value.brew : null))
const joltSpec = computed(() => motionSpec(props.value.jolt))
const floatSpec = computed(() => motionSpec(props.value.float))
const forgeSpec = computed(() => motionSpec(props.value.forge))
const crustSpec = computed(() => motionSpec(props.value.crust))

const fxEnabled = computed(() =>
  !reducedMotion.value
  && (
    !!activeGlyph.value
    || !!props.value.flashes?.enabled
    || !!props.value.sparkles?.enabled
    || !!props.value.chromaticSplit?.enabled
    || !!props.value.crust?.enabled
    || !!props.value.spectrumSplit?.enabled
    || !!props.value.jolt?.enabled
    || !!props.value.float?.enabled
  ),
)

const needsTimeline = computed(() => {
  if (reducedMotion.value) return false
  return isAnimated(props.value) || props.value.states.some((s) => s.glisten?.enabled) || fxEnabled.value
})

const { tMs } = useTimeline({ active: () => needsTimeline.value })

const state = computed<TitleStateValue>(() =>
  pickInterpolatedState(
    { states: effectiveStates.value, durationMs: props.value.durationMs, loop: props.value.loop },
    tMs.value,
    interpolateTitleState,
  ),
)

const textStyle = computed(() => {
  const out: Record<string, string> = {}
  if (state.value.color) out.color = state.value.color
  if (state.value.fontWeight) out.fontWeight = String(state.value.fontWeight)
  if (state.value.fontStyle) out.fontStyle = state.value.fontStyle
  if (state.value.letterSpacingPx != null) out.letterSpacing = `${state.value.letterSpacingPx}px`
  if (isPixelFont.value && state.value.color) {
    const shadow = darken(state.value.color, 0.6)
    out.textShadow = `1px 1px 0 ${shadow}, 0 1px 0 ${shadow}, 1px 0 0 ${shadow}`
  }
  return out
})

const legacyGradientStyle = computed(() => {
  if (isPixelFont.value) return undefined
  if (!state.value.gradient) return undefined
  return {
    background: gradientToCss(state.value.gradient),
    webkitBackgroundClip: 'text',
    backgroundClip: 'text',
    color: 'transparent',
  } as Record<string, string>
})

const BAND_WIDTH_PCT = 16

const glistenPhase = computed<{ active: boolean; leftPct: number; highlight: string }>(() => {
  const g = state.value.glisten
  if (!g?.enabled || reducedMotion.value) return { active: false, leftPct: 0, highlight: '#ffffff' }
  const interval = g.intervalMs ?? 5000
  const duration = g.durationMs ?? 800
  const cyclePos = tMs.value % interval
  if (cyclePos > duration) return { active: false, leftPct: 0, highlight: g.highlight ?? '#ffffff' }
  const progress = cyclePos / duration
  const leftPct = -BAND_WIDTH_PCT + (100 + BAND_WIDTH_PCT * 2) * progress
  return { active: true, leftPct, highlight: g.highlight ?? '#ffffff' }
})

const glistenClipStyle = computed<Record<string, string> | undefined>(() => {
  const p = glistenPhase.value
  if (!p.active) return undefined
  const right = 100 - p.leftPct - BAND_WIDTH_PCT
  return {
    color: p.highlight,
    clipPath: `inset(0 ${right}% 0 ${p.leftPct}%)`,
    WebkitClipPath: `inset(0 ${right}% 0 ${p.leftPct}%)`,
  }
})

interface FlashInstance {
  id: number
  bornAt: number
  xPct: number
  yPct: number
  rotDeg: number
  lenEm: number
}

interface SparkleInstance {
  id: number
  bornAt: number
  xPct: number
  yPct: number
  sizePx: number
  rotDeg: number
}

const SPARKLE_PATHS = {
  star: 'M5 0 Q5.9 4.1 10 5 Q5.9 5.9 5 10 Q4.1 5.9 0 5 Q4.1 4.1 5 0 Z',
  paw: 'M5,4.8 C6.7,4.8 7.9,5.9 7.9,7.3 C7.9,8.7 6.5,9.4 5,9.4 C3.5,9.4 2.1,8.7 2.1,7.3 C2.1,5.9 3.3,4.8 5,4.8 Z M0.5,3.3 a1,1 0 1,0 2,0 a1,1 0 1,0 -2,0 Z M2.8,1.8 a1,1 0 1,0 2,0 a1,1 0 1,0 -2,0 Z M5.2,1.8 a1,1 0 1,0 2,0 a1,1 0 1,0 -2,0 Z M7.5,3.3 a1,1 0 1,0 2,0 a1,1 0 1,0 -2,0 Z',
  firefly: 'M2.6 5 a2.4 2.4 0 1 0 4.8 0 a2.4 2.4 0 1 0 -4.8 0 Z M4.6 0.4 h0.8 v1.6 h-0.8 Z M4.6 8 h0.8 v1.6 h-0.8 Z M0.4 4.6 h1.6 v0.8 h-1.6 Z M8 4.6 h1.6 v0.8 h-1.6 Z',
  snowflake: 'M4.6 0 h0.8 v10 h-0.8 Z M0 4.6 h10 v0.8 h-10 Z M1.4 1.1 l0.6 -0.6 l7.1 7.1 l-0.6 0.6 Z M8.6 0.5 l0.6 0.6 l-7.1 7.1 l-0.6 -0.6 Z M3.2 2.2 l1.8 1.1 l1.8 -1.1 l0.4 0.7 l-2.2 1.3 l-2.2 -1.3 Z M3.2 7.8 l1.8 -1.1 l1.8 1.1 l0.4 -0.7 l-2.2 -1.3 l-2.2 1.3 Z',
} as const

const sparkleShape = computed(() => {
  const shape = props.value.sparkles?.shape
  return shape && shape in SPARKLE_PATHS ? (shape as keyof typeof SPARKLE_PATHS) : 'star'
})
const sparklePath = computed(() => SPARKLE_PATHS[sparkleShape.value])

const ORNAMENT_ICONS: Record<string, { viewBox: string; d: string; fillRule?: 'evenodd' }> = {
  jack_o_lantern: {
    viewBox: '0 0 24 24',
    fillRule: 'evenodd',
    d: 'M11.2,5.6 C11.1,4 11.6,2.8 12.6,2 L14.1,2.7 C13.3,3.5 12.9,4.5 12.9,5.6 Z M12,6 C6.6,6 3,9.2 3,13.4 C3,17.6 6.6,21 12,21 C17.4,21 21,17.6 21,13.4 C21,9.2 17.4,6 12,6 Z M6.2,12.6 L9.8,10.2 L9.4,13.4 Z M17.8,12.6 L14.2,10.2 L14.6,13.4 Z M12,13.2 L13.1,15 L10.9,15 Z M6.8,16.2 L8.4,15.4 L9.3,16.8 L10.6,15.4 L11.6,16.8 L12.7,15.4 L13.8,16.8 L15,15.4 L16,16.8 L17.2,16.2 L16.2,18.4 L14.6,17.6 L13.6,18.6 L12.2,17.7 L10.8,18.6 L9.6,17.6 L8,18.4 Z',
  },
  yarn_ball: {
    viewBox: '0 0 256 256',
    d: 'M69.4 144.89a221 221 0 0 0-18.77 42.6a4 4 0 0 1-7 1.19a103.44 103.44 0 0 1-18.83-48.11a4 4 0 0 1 4.13-4.47a119 119 0 0 1 40.47 8.79M44 77.14a180.1 180.1 0 0 1 63 19.12a227 227 0 0 1 22.6-19.49a206.4 206.4 0 0 0-69.28-25.6a4 4 0 0 0-3.42 1A105.3 105.3 0 0 0 41.08 71A4 4 0 0 0 44 77.14m195.58 144.21A7.91 7.91 0 0 0 232 216h-48.64a104.25 104.25 0 0 0 46.89-69a4 4 0 0 0-5.27-4.52a120.6 120.6 0 0 0-74.1 73.52H134a136.55 136.55 0 0 1 94.78-91.37a4 4 0 0 0 2.92-4.15a102.6 102.6 0 0 0-3.58-20.56a4 4 0 0 0-4.89-2.8A164.53 164.53 0 0 0 103 225a4 4 0 0 0 3.08 4.69A104 104 0 0 0 128 232h104a8 8 0 0 0 7.58-10.65m-211-101.27a134.5 134.5 0 0 1 49.39 11a224 224 0 0 1 17.55-22.68a164.3 164.3 0 0 0-62.16-16.12a4 4 0 0 0-4 2.75a103 103 0 0 0-4.63 20.61a4 4 0 0 0 3.84 4.44Zm57.26-79.42A222.8 222.8 0 0 1 144 66.8a221.3 221.3 0 0 1 38.8-19.67a4 4 0 0 0 .7-7.08a103.86 103.86 0 0 0-98.2-6.85a4 4 0 0 0 .54 7.46M216 82.51a4 4 0 0 0 2.4-5.87a105 105 0 0 0-12.82-17.81a4 4 0 0 0-4.21-1.19A208.81 208.81 0 0 0 62.21 205.51a4 4 0 0 0 1.44 4.13a104.3 104.3 0 0 0 18.55 11.72a4 4 0 0 0 5.71-2.75A180.61 180.61 0 0 1 216 82.51',
  },
  witch_hat: {
    viewBox: '0 0 24 24',
    d: 'M2,19.5 L22,19.5 L19.2,16.6 L4.8,16.6 Z M6.6,16.6 L9.4,6.2 L16.4,9.8 L14.9,16.6 Z M7.9,13.2 L15.4,13.2 L15.1,14.6 L7.6,14.6 Z',
  },
  pumpkin: {
    viewBox: '0 0 24 24',
    d: 'M11.2,5.6 C11.1,4 11.6,2.8 12.6,2 L14.1,2.7 C13.3,3.5 12.9,4.5 12.9,5.6 Z M12,6 C6.6,6 3,9.2 3,13.4 C3,17.6 6.6,21 12,21 C17.4,21 21,17.6 21,13.4 C21,9.2 17.4,6 12,6 Z',
  },
  alpha: {
    viewBox: '0 0 24 24',
    d: 'M10.62,6.66 C7.4,6.66 5.28,8.96 5.28,12 C5.28,15.04 7.4,17.34 10.62,17.34 C13.84,17.34 15.96,15.04 15.96,12 C15.96,8.96 13.84,6.66 10.62,6.66 Z M10.62,9.06 C12.55,9.06 13.56,10.34 13.56,12 C13.56,13.66 12.55,14.94 10.62,14.94 C8.69,14.94 7.68,13.66 7.68,12 C7.68,10.34 8.69,9.06 10.62,9.06 Z M19.91,6.85 C17.7,8.87 16.78,10.71 16.97,12.55 C17.15,14.58 18.35,16.42 20.46,18.07 L18.62,19.54 C16.23,17.52 14.94,15.13 14.76,12.74 C14.58,10.16 15.86,7.77 18.44,5.56 Z',
  },
}

const ornament = computed(() => {
  const spec = props.value.ornament
  if (!spec) return null
  const icon = ORNAMENT_ICONS[spec.icon]
  if (!icon) return null
  const color = tone(spec.lightColor, spec.color, 'currentColor')
  return { ...icon, color, sizeEm: spec.sizeEm ?? 1, fillRule: icon.fillRule }
})

const aura = computed(() => {
  const spec = props.value.aura
  return spec?.enabled ? spec : null
})

const auraLinks = computed<TitleAuraLinks>(() => ({
  frost: props.value.frost,
  bleed: props.value.bleed,
  lantern: props.value.lantern,
}))

const auraKey = computed(() =>
  aura.value ? `${isLightBase.value ? 'l' : 'd'}:${JSON.stringify(aura.value)}` : '',
)

let fxId = 0
let nextFlashAt = -1
let nextSparkleAt = -1
let nextSplitAt = -1
let splitStartedAt = -1
const activeFlashes = ref<FlashInstance[]>([])
const activeSparkles = ref<SparkleInstance[]>([])
const splitActive = ref(false)

watch(
  () => props.value,
  () => {
    activeFlashes.value = []
    activeSparkles.value = []
    nextJoltAt = -1
    joltStartedAt = -1
    nextFlashAt = -1
    nextSparkleAt = -1
    nextSplitAt = -1
    splitStartedAt = -1
    splitActive.value = false
  },
)

const splitShadowStyle = computed<Record<string, string> | undefined>(() => {
  const spec = props.value.chromaticSplit
  if (!spec?.enabled || !splitActive.value) return undefined
  const offset = spec.offsetPx ?? 3
  const colorA = tone(spec.lightColorA, spec.colorA, 'rgba(255,50,170,0.85)')
  const colorB = tone(spec.lightColorB, spec.colorB, 'rgba(50,190,255,0.85)')
  return { textShadow: `-${offset}px 0 ${colorA}, ${offset}px 0 ${colorB}` }
})


let nextJoltAt = -1
let joltStartedAt = -1

const joltNow = computed(() => {
  const spec = joltSpec.value
  if (!spec || joltStartedAt < 0) return null
  return joltFrame(tMs.value - joltStartedAt, spec)
})

const joltFlashColor = computed(() => {
  const spec = joltSpec.value
  return tone(spec?.lightFlash, spec?.flash, '#ffffff')
})

const joltStyle = computed<Record<string, string> | undefined>(() => {
  const spec = joltSpec.value
  const fr = joltNow.value
  if (!spec || !fr) return undefined
  const scream = pickVariant(isLightBase.value, spec.lightScreamColor, spec.screamColor)
  const style: Record<string, string> = {
    display: 'inline-block',
    transform: `translate(${fr.dx.toFixed(3)}em, ${fr.dy.toFixed(3)}em) scale(${fr.scale.toFixed(3)}) rotate(${fr.rotate.toFixed(2)}deg)`,
    transformOrigin: '50% 60%',
    letterSpacing: `${fr.spacing.toFixed(3)}em`,
  }
  if (fr.scream && scream) style.color = scream
  return style
})

const joltFlashStyle = computed<Record<string, string> | undefined>(() => {
  const fr = joltNow.value
  if (!fr || fr.flash <= 0) return undefined
  return { background: withAlpha(joltFlashColor.value, fr.flash) }
})

const joltRingStyles = computed<Record<string, string>[]>(() => {
  const fr = joltNow.value
  if (!fr) return []
  return fr.rings.map((p) => ({
    width: `${(1.2 + p * 4.2).toFixed(2)}em`,
    height: `${(0.8 + p * 2.6).toFixed(2)}em`,
    opacity: (0.85 * (1 - p)).toFixed(3),
    borderColor: joltFlashColor.value,
    borderWidth: `${Math.max(1, 3 * (1 - p)).toFixed(1)}px`,
  }))
})

const floatStyle = computed<Record<string, string> | undefined>(() => {
  const spec = floatSpec.value
  if (!spec) return undefined
  const t = tMs.value / 1000
  const period = (spec.periodMs ?? 3400) / 1000
  const y = Math.sin((t * Math.PI * 2) / period) * (spec.ampEm ?? 0.12)
  const tilt = Math.sin((t * Math.PI * 2) / (period * 1.7) + 1) * (spec.tiltDeg ?? 2)
  return { display: 'inline-block', transform: `translateY(${y.toFixed(3)}em) rotate(${tilt.toFixed(2)}deg)`, transformOrigin: '50% 60%' }
})


const forgeHeadStyle = computed<Record<string, string> | undefined>(() => {
  const spec = forgeSpec.value
  if (!spec) return undefined
  const interval = spec.intervalMs ?? 8000
  const stagger = spec.staggerMs ?? 180
  const stamp = spec.stampMs ?? 130
  const chars = props.value.text.length
  const startMs = interval * 0.72 - 150
  const endMs = interval * 0.72 + stagger * Math.max(0, chars - 1) + stamp
  const local = (tMs.value % interval) - startMs
  const span = endMs - startMs
  if (local < 0 || local > span) return undefined
  const hot = tone(spec.lightHot, spec.hot, '#ffffff')
  return {
    left: `${(local / span) * 100}%`,
    '--fx-c': hot,
  }
})

const crustCycle = computed(() => {
  const spec = crustSpec.value
  if (!spec) return null
  const interval = ((spec.minIntervalMs ?? 7000) + (spec.maxIntervalMs ?? 9000)) / 2
  return { interval, c: (tMs.value % interval) / interval }
})

const crustBaseStyle = computed<Record<string, string> | undefined>(() => {
  const spec = crustSpec.value
  const cycle = crustCycle.value
  if (!spec || !cycle) return undefined
  const crust = tone(spec.lightCrust, spec.crust, '#4a1a0e')
  const crack = tone(spec.lightCrack, spec.crack, '#ff7a45')
  const pos = (cycle.c * 34) % 100
  return {
    background: `repeating-linear-gradient(68deg, ${crust} 0 5px, ${crack} 5px 7px, ${crust} 7px 12px)`,
    backgroundSize: '200% 100%',
    backgroundPosition: `${pos.toFixed(2)}% 0`,
    webkitBackgroundClip: 'text',
    backgroundClip: 'text',
    color: 'transparent',
    filter: `drop-shadow(0 0 0.3em ${crack}59)`,
  }
})

const crustEruption = computed(() => {
  const spec = crustSpec.value
  const cycle = crustCycle.value
  if (!spec || !cycle) return 0
  const eruptMs = spec.eruptMs ?? 600
  const frac = eruptMs / cycle.interval
  const p = win(cycle.c, 0.76, 0.76 + frac)
  return p >= 0 ? Math.sin(p * Math.PI) : 0
})

const crustMoltenStyle = computed<Record<string, string> | undefined>(() => {
  const spec = crustSpec.value
  if (!spec || crustEruption.value <= 0.01) return undefined
  const molten = spec.molten ?? '#ff8a3d'
  const hot = spec.moltenHot ?? '#ffd9a0'
  return {
    background: `linear-gradient(${hot}, ${molten})`,
    webkitBackgroundClip: 'text',
    backgroundClip: 'text',
    color: 'transparent',
    opacity: crustEruption.value.toFixed(3),
    filter: `drop-shadow(0 0 0.4em ${molten})`,
  }
})

const crustEmbers = computed<{ id: number; style: Record<string, string> }[]>(() => {
  const spec = crustSpec.value
  const cycle = crustCycle.value
  if (!spec || !cycle) return []
  const p = win(cycle.c, 0.76, 0.9)
  if (p < 0) return []
  const seed = Math.floor(tMs.value / cycle.interval)
  const out = []
  for (let i = 0; i < 3; i++) {
    const delay = i * 0.12
    const q = Math.max(0, Math.min(1, (p - delay) / (1 - delay)))
    if (q <= 0 || q >= 1) continue
    out.push({
      id: i,
      style: {
        left: `${(12 + sinHash01(seed * 7 + i) * 70).toFixed(1)}%`,
        top: `${(25 + sinHash01(seed * 13 + i) * 30).toFixed(1)}%`,
        background: spec.moltenHot ?? '#ffd9a0',
        transform: `translateY(${(-q * 1.6).toFixed(2)}em)`,
        opacity: String(Math.sin(q * Math.PI)),
      },
    })
  }
  return out
})

const spectrumStyle = computed<Record<string, string> | undefined>(() => {
  const spec = props.value.spectrumSplit
  if (!spec?.enabled || reducedMotion.value) return undefined
  const interval = spec.intervalMs ?? 5000
  const colors = tone(spec.lightColors, spec.colors, ['#f472b6', '#62d98a', '#e9e7f4', '#8da3c0', '#ff5c33'])
  const fused = tone(spec.lightFused, spec.fused, '#ffffff')
  const offset = spec.offsetPx ?? 14
  const c = (tMs.value % interval) / interval
  const split = win(c, 0.6, 0.72)
  const hold = win(c, 0.72, 0.82)
  const fuse = win(c, 0.82, 0.92)
  const flash = win(c, 0.92, 1)
  let amt = 0
  if (split >= 0) amt = 1 - Math.pow(1 - split, 3)
  else if (hold >= 0) amt = 1
  else if (fuse >= 0) amt = 1 - Math.pow(fuse, 2)
  if (amt > 0.02) {
    const n = colors.length
    const wob = hold >= 0 ? Math.sin(tMs.value / 90) : 0
    const shadows = colors.map((col, i) => {
      const dx = ((i - (n - 1) / 2) * offset * amt / ((n - 1) / 2)).toFixed(1)
      const dy = (wob * (i % 2 ? 1 : -1)).toFixed(1)
      return `${dx}px ${dy}px 0 ${col}`
    })
    return { color: 'rgba(10,10,18,0.9)', textShadow: shadows.join(', ') }
  }
  if (flash >= 0) {
    const fl = Math.sin(flash * Math.PI)
    return { color: fused, textShadow: `0 0 ${(fl * 0.6).toFixed(2)}em ${fused}` }
  }
  const microInterval = spec.microIntervalMs ?? 1900
  const microMs = spec.microMs ?? 420
  const mc = tMs.value % microInterval
  const mp = mc / microMs
  if (mp < 1 && (tMs.value % interval) / interval < 0.55) {
    const ta = Math.sin(mp * Math.PI)
    const first = colors[0]
    const last = colors[colors.length - 1]
    const d = (3 * ta).toFixed(1)
    return {
      color: fused,
      textShadow: `-${d}px 0 ${first}, ${d}px 0 ${last}`,
    }
  }
  return { color: fused, textShadow: 'none' }
})

function spawnFlash(now: number) {
  const zone = Math.floor(Math.random() * 3)
  let xPct: number, yPct: number, rotDeg: number
  if (zone === 0) {
    xPct = rand(-3, 3)
    yPct = rand(15, 85)
    rotDeg = rand(-16, 16)
  } else if (zone === 1) {
    xPct = rand(97, 103)
    yPct = rand(15, 85)
    rotDeg = rand(164, 196)
  } else {
    xPct = rand(25, 75)
    yPct = rand(-60, -35)
    rotDeg = rand(74, 106)
  }
  activeFlashes.value.push({ id: ++fxId, bornAt: now, xPct, yPct, rotDeg, lenEm: rand(1.9, 2.8) })
}

function spawnSparkle(now: number, baseSizePx: number) {
  const spread = props.value.sparkles?.spreadPct ?? 0
  activeSparkles.value.push({
    id: ++fxId,
    bornAt: now,
    xPct: rand(4 - spread, 96 + spread),
    yPct: rand(12 - spread * 3, 88 + spread * 3),
    sizePx: baseSizePx * rand(0.8, 1.4),
    rotDeg: sparkleShape.value === 'paw' ? rand(0, 360) : rand(0, 90),
  })
}

watch(tMs, (now) => {
  if (!fxEnabled.value) return
  const jolt = joltSpec.value
  if (jolt) {
    const d = joltDurations(jolt)
    const total = d.windup + d.hold + d.recoil
    if (nextJoltAt < 0) nextJoltAt = now + rand(1200, jolt.maxIntervalMs ?? 6500)
    if (joltStartedAt < 0 && now >= nextJoltAt) {
      joltStartedAt = now
      nextJoltAt = now + total + rand(jolt.minIntervalMs ?? 3000, jolt.maxIntervalMs ?? 6500)
    }
    if (joltStartedAt >= 0 && now - joltStartedAt >= total) {
      joltStartedAt = -1
    }
  }
  const flashes = props.value.flashes
  if (flashes?.enabled) {
    const dur = flashes.durationMs ?? 260
    if (nextFlashAt < 0) nextFlashAt = now + rand(0, flashes.maxIntervalMs ?? 1100)
    if (now >= nextFlashAt) {
      spawnFlash(now)
      nextFlashAt = now + rand(flashes.minIntervalMs ?? 320, flashes.maxIntervalMs ?? 1100)
    }
    if (activeFlashes.value.some((f) => now - f.bornAt >= dur)) {
      activeFlashes.value = activeFlashes.value.filter((f) => now - f.bornAt < dur)
    }
  }
  const sparkles = props.value.sparkles
  if (sparkles?.enabled) {
    const fade = sparkles.fadeMs ?? 700
    if (nextSparkleAt < 0) nextSparkleAt = now
    if (now >= nextSparkleAt) {
      spawnSparkle(now, sparkles.sizePx ?? 5)
      nextSparkleAt = now + (1000 / (sparkles.perSecond ?? 3)) * rand(0.5, 1.5)
    }
    if (activeSparkles.value.some((s) => now - s.bornAt >= fade)) {
      activeSparkles.value = activeSparkles.value.filter((s) => now - s.bornAt < fade)
    }
  }
  const split = props.value.chromaticSplit
  if (split?.enabled) {
    const dur = split.durationMs ?? 420
    if (nextSplitAt < 0) nextSplitAt = now + rand(0, split.maxIntervalMs ?? 4400)
    if (splitStartedAt < 0 && now >= nextSplitAt) {
      splitStartedAt = now
      nextSplitAt = now + rand(split.minIntervalMs ?? 2800, split.maxIntervalMs ?? 4400)
    }
    if (splitStartedAt >= 0) {
      const p = (now - splitStartedAt) / dur
      if (p >= 1) {
        splitStartedAt = -1
        splitActive.value = false
      } else {
        splitActive.value = p < 0.36 || p >= 0.5
      }
    }
  }
})

function flashStyle(fl: FlashInstance): Record<string, string> {
  const spec = props.value.flashes
  const dur = spec?.durationMs ?? 260
  const p = Math.min(1, (tMs.value - fl.bornAt) / dur)
  return {
    '--fx-c': tone(spec?.lightColor, spec?.color, '#ffffff'),
    left: `${fl.xPct}%`,
    top: `${fl.yPct}%`,
    width: `${fl.lenEm}em`,
    transform: `translateY(-50%) rotate(${fl.rotDeg}deg) scaleX(${0.8 + 0.35 * p})`,
    opacity: String(Math.pow(1 - p, 1.6) * 0.95),
  }
}

function sparkleStyle(sp: SparkleInstance): Record<string, string> {
  const spec = props.value.sparkles
  const fade = spec?.fadeMs ?? 700
  const p = Math.min(1, (tMs.value - sp.bornAt) / fade)
  const wave = Math.sin(Math.PI * p)
  return {
    color: tone(spec?.lightColor, spec?.color, '#ffffff'),
    left: `${sp.xPct}%`,
    top: `${sp.yPct}%`,
    width: `${sp.sizePx}px`,
    transform: `translate(-50%, -50%) rotate(${sp.rotDeg}deg) scale(${0.6 + 0.5 * wave})`,
    opacity: String(wave),
  }
}
</script>

<template>
  <span
    class="title-renderer"
    :class="{ 'title-renderer--pixel': isPixelFont }"
    :style="textStyle"
  >
    <TitleAura v-if="aura" :key="auraKey" :aura="aura" :light="isLightBase" :links="auraLinks" />
    <TitleBrewLayer
      v-if="brewSpec"
      :key="isLightBase ? 'brew-l' : 'brew-d'"
      :brew="brewSpec"
      :light="isLightBase"
      @liquid="brewLiquid = $event"
      @splash="onBrewSplash"
    />
    <span
      v-for="fl in activeFlashes"
      :key="fl.id"
      class="title-renderer__flash"
      :style="flashStyle(fl)"
      aria-hidden="true"
    />
    <svg
      v-if="ornament"
      class="title-renderer__ornament"
      :style="{ height: `${ornament.sizeEm}em` }"
      :viewBox="ornament.viewBox"
      aria-hidden="true"
    >
      <path :d="ornament.d" :fill="ornament.color" :fill-rule="ornament.fillRule" />
    </svg>
    <span
      v-if="joltFlashStyle"
      class="title-renderer__jolt-flash"
      :style="joltFlashStyle"
      aria-hidden="true"
    />
    <span
      v-for="(ring, ri) in joltRingStyles"
      :key="`jr${ri}`"
      class="title-renderer__jolt-ring"
      :style="ring"
      aria-hidden="true"
    />
    <span
      v-for="qm in activeQuestMarkers"
      :key="`qm${qm.key}`"
      class="title-renderer__quest-mark"
      :style="{
        left: `${qm.leftPct}%`,
        color: qm.color,
        opacity: String(qm.opacity),
        transform: `translate(-50%, ${qm.bobEm.toFixed(3)}em) scale(${qm.scale.toFixed(3)})`,
        textShadow: `0 0 0.25em ${qm.color}`,
      }"
      aria-hidden="true"
    >{{ qm.text }}</span>
    <span v-if="glyphChars" class="title-renderer__text" :style="[floatStyle ?? {}, joltStyle ?? {}]">
      <span
        v-for="(ch, i) in glyphChars"
        :key="i"
        class="title-renderer__forge-char"
        :style="glyphStyle(i)"
      ><template v-if="reelSpec && glyphText(ch, i) !== ch"><span class="title-renderer__reel-hold">{{ ch }}</span><span class="title-renderer__reel-face">{{ glyphText(ch, i) }}</span></template><template v-else>{{ glyphText(ch, i) }}</template></span>
      <span
        v-if="forgeHeadStyle"
        class="title-renderer__forge-head"
        :style="forgeHeadStyle"
        aria-hidden="true"
      />
    </span>
    <span
      v-else
      class="title-renderer__text"
      :style="[legacyGradientStyle ?? {}, splitShadowStyle ?? {}, crustBaseStyle ?? {}, spectrumStyle ?? {}, floatStyle ?? {}, joltStyle ?? {}]"
    >{{ value.text }}</span>
    <span
      v-if="crustMoltenStyle"
      class="title-renderer__crust-molten"
      :style="crustMoltenStyle"
      aria-hidden="true"
    >{{ value.text }}</span>
    <span
      v-for="em in crustEmbers"
      :key="`ce${em.id}`"
      class="title-renderer__ember"
      :style="em.style"
      aria-hidden="true"
    />
    <span
      v-if="glistenClipStyle"
      class="title-renderer__glint"
      :style="glistenClipStyle"
      aria-hidden="true"
    >{{ value.text }}</span>
    <svg
      v-for="sp in activeSparkles"
      :key="sp.id"
      class="title-renderer__sparkle"
      :style="sparkleStyle(sp)"
      viewBox="0 0 10 10"
      aria-hidden="true"
    >
      <path :d="sparklePath" fill="currentColor" />
    </svg>
  </span>
</template>

<style scoped>
.title-renderer {
  position: relative;
  display: inline-block;
  font-family: var(--font-sans);
  font-size: var(--text-caption);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  white-space: nowrap;
}

.title-renderer--pixel {
  font-family: 'Silkscreen', ui-monospace, monospace;
  text-transform: none;
  letter-spacing: 0.02em;
  image-rendering: pixelated;
}

.title-renderer__text {
  position: relative;
  z-index: 1;
}

.title-renderer__ornament {
  position: relative;
  display: inline-block;
  width: auto;
  aspect-ratio: 1 / 1;
  margin-right: 0.28em;
  vertical-align: -0.12em;
  overflow: visible;
  z-index: 1;
}

.title-renderer__glint {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 2;
  font: inherit;
  letter-spacing: inherit;
  text-transform: inherit;
  white-space: inherit;
}

.title-renderer__flash {
  position: absolute;
  height: 0.95em;
  pointer-events: none;
  z-index: 0;
  transform-origin: 0 50%;
  clip-path: polygon(0 50%, 100% 0, 100% 100%);
  background: linear-gradient(
    90deg,
    color-mix(in srgb, var(--fx-c) 95%, transparent) 0%,
    color-mix(in srgb, var(--fx-c) 60%, transparent) 12%,
    color-mix(in srgb, var(--fx-c) 25%, transparent) 45%,
    transparent 100%
  );
}

.title-renderer__sparkle {
  position: absolute;
  pointer-events: none;
  z-index: 3;
}

.title-renderer__forge-char {
  position: relative;
  display: inline-block;
}

.title-renderer__reel-hold {
  visibility: hidden;
}

.title-renderer__reel-face {
  position: absolute;
  left: 50%;
  top: 0;
  transform: translateX(-50%);
}

.title-renderer__quest-mark {
  position: absolute;
  top: -0.95em;
  font-weight: 800;
  font-size: 0.85em;
  pointer-events: none;
  z-index: 3;
}

.title-renderer__jolt-flash {
  position: absolute;
  inset: -40% -30%;
  border-radius: 4px;
  pointer-events: none;
  z-index: 0;
}

.title-renderer__jolt-ring {
  position: absolute;
  left: 50%;
  top: 55%;
  transform: translate(-50%, -50%);
  border-style: solid;
  border-radius: 50%;
  pointer-events: none;
  z-index: 0;
}

.title-renderer__forge-head {
  position: absolute;
  top: -30%;
  bottom: -30%;
  width: 2px;
  background: linear-gradient(180deg, transparent, var(--fx-c), transparent);
  opacity: 0.9;
  pointer-events: none;
}

.title-renderer__crust-molten {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 2;
  font: inherit;
  letter-spacing: inherit;
  text-transform: inherit;
  white-space: inherit;
}

.title-renderer__ember {
  position: absolute;
  width: 0.16em;
  height: 0.16em;
  border-radius: 50%;
  pointer-events: none;
  z-index: 3;
}
</style>
