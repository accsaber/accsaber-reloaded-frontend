import { MILESTONE_ICON_GROUPS, type MilestoneIconGroup } from '@/types/api/milestones'
import { MILESTONE_TIERS, type MilestoneFrameTier } from '@/utils/milestoneTiers'

type MilestoneFineKey =
  | 'plays'
  | 'plays_ap'
  | 'plays_rank'
  | 'plays_score'
  | 'plays_map'
  | 'avg_acc'
  | 'best_acc'
  | 'best_ap'
  | 'best_streak'
  | 'pauses'
  | 'rank_best'
  | 'rank_country'
  | 'unique_maps'
  | 'unique_diffs'
  | 'resubmit'
  | 'old_score'
  | 'stamina'
  | 'rock_bottom'
  | 'broken_streak'

export type MilestoneGlyphKey = MilestoneIconGroup | MilestoneFineKey

type GlyphMode = 'row' | 'stack' | 'nest' | 'growth' | 'orbit' | 'deck' | 'rotate'

interface GlyphSpec {
  mode: GlyphMode
  unit: string
  unitFill?: boolean
  step?: number
  core?: string
  orbitRadius?: number
}

const TRI_RIGHT = 'M10.3 9 15.1 12 10.3 15Z'
const TRI_UP = 'M12 9.1 15 14.9H9Z'
const DIAMOND_S = 'M12 9 15 12 12 15 9 12Z'
const SQUARE_S = 'M9.6 9.6h4.8v4.8H9.6Z'
const CIRCLE_S = 'M14.6 12a2.6 2.6 0 1 1-5.2 0 2.6 2.6 0 1 1 5.2 0'
const CROSS_S = 'M9.8 9.8l4.4 4.4M14.2 9.8l-4.4 4.4'
const PAUSE_S = 'M10.5 9.2v5.6M13.5 9.2v5.6'
const HOURGLASS_S = 'M9.6 9.2h4.8l-4.8 2.8 4.8 2.8H9.6Z'
const PENNANT_S = 'M10 15.4V8.6M10 9h4.4l-1 1.5 1 1.5h-4.4'
const SHEET_S = 'M9.6 9h3.2l1.6 1.6V15H9.6Z'
const ARROW_DOWN_S = 'M12 9.2v4.6M10 12.2 12 14.2l2-2'
const GAUGE_S = 'M9 12h6M12 10.6v2.8'
const CHEV_UP_S = 'M8.8 13.6 12 10.4 15.2 13.6'
const CHEV_DOWN_S = 'M8.8 10.4 12 13.6 15.2 10.4'
const RAY_S = 'M12 11.2V5.4'
const LAYER_S = 'M12 10.2 16 12 12 13.8 8 12Z'
const PULSE_S = 'M8 12h1.6l1.2-1.8 1.6 3.6 1-1.8h2.6'
const SLIDER_S = 'M8 12h1.8M13.2 12h2.8M9.8 12a1.7 1.7 0 1 0 3.4 0 1.7 1.7 0 1 0-3.4 0'
const SWAP_ARM = 'M12 10.8V5.2M10.2 7 12 5.1l1.8 1.9'
const SPARK_ARM = 'M12 11.2c.4-2.2.9-3.6 0-5.8-.9 2.2-.4 3.6 0 5.8Z'
const STEP_UP_S = 'M8.8 13.9h3.2v-3.2h3.2'
const TROPHY_S = 'M10.4 13.8V12a1.6 1.6 0 0 1 3.2 0v1.8M9.8 13.8h4.4'
const CRATE_N = 'M5 5h14v14H5ZM5 9.6h14'
const CUBE_N = 'M12 4.6 19 8.6v6.8L12 19.4 5 15.4V8.6Z'
const TAG_CORE = 'M9.6 12.4 12.4 9.6h2.6v2.6l-2.8 2.8Z'
const RING = 'M20 12a8 8 0 1 1-16 0 8 8 0 1 1 16 0'
const DIAMOND = 'M12 3.8 20.2 12 12 20.2 3.8 12Z'
const HEX = 'M12 4 19.4 8.2v7.6L12 20 4.6 15.8V8.2Z'
const TRIANGLE = 'M12 5 19.4 19H4.6Z'
const HEAD = 'M15.7 8.3a3.7 3.7 0 1 1-7.4 0 3.7 3.7 0 0 1 7.4 0'
const NODE_CORE = 'M14.4 12a2.4 2.4 0 1 1-4.8 0 2.4 2.4 0 1 1 4.8 0'

const ROW = 5.8
const STACK = 4.6
const DECK = 1.9
const STAIR = 5.6

const SPECS: Record<MilestoneGlyphKey, GlyphSpec> = {
  AP: { mode: 'nest', unit: DIAMOND },
  ACCURACY: { mode: 'nest', unit: RING },
  RANK: { mode: 'growth', unit: '' },
  STREAK: { mode: 'stack', unit: CHEV_UP_S, step: STACK },
  SCORE: { mode: 'row', unit: CIRCLE_S, unitFill: true, step: ROW },
  MAP: { mode: 'deck', unit: SQUARE_S, step: DECK },
  MISTAKE: { mode: 'row', unit: CROSS_S, step: ROW },
  XP: { mode: 'rotate', unit: RAY_S },
  PLAYER: { mode: 'orbit', unit: '', core: HEAD, orbitRadius: 6.6 },
  LEVEL: { mode: 'growth', unit: '' },
  MODIFIER: { mode: 'stack', unit: SLIDER_S, step: STACK },
  CAMPAIGN: { mode: 'orbit', unit: '', core: NODE_CORE, orbitRadius: 5.8 },
  MISSION: { mode: 'row', unit: PENNANT_S, step: ROW },
  MILESTONE: { mode: 'orbit', unit: '', core: TROPHY_S, orbitRadius: 6.2 },
  ITEM: { mode: 'nest', unit: CUBE_N },
  CRATE: { mode: 'nest', unit: CRATE_N },
  MARKET: { mode: 'deck', unit: TAG_CORE, step: DECK },
  TRADE: { mode: 'rotate', unit: SWAP_ARM },
  ESSENCE: { mode: 'rotate', unit: SPARK_ARM, unitFill: true },
  GENERAL: { mode: 'nest', unit: HEX },

  plays: { mode: 'row', unit: TRI_RIGHT, unitFill: true, step: ROW },
  plays_ap: { mode: 'deck', unit: DIAMOND_S, unitFill: true, step: DECK },
  plays_rank: { mode: 'row', unit: TRI_UP, unitFill: true, step: ROW },
  plays_score: { mode: 'row', unit: CIRCLE_S, unitFill: true, step: ROW },
  plays_map: { mode: 'deck', unit: SQUARE_S, step: DECK },
  avg_acc: { mode: 'stack', unit: GAUGE_S, step: STACK },
  best_acc: { mode: 'nest', unit: RING },
  best_ap: { mode: 'nest', unit: HEX },
  best_streak: { mode: 'stack', unit: CHEV_UP_S, step: STACK },
  pauses: { mode: 'row', unit: PAUSE_S, step: ROW },
  rank_best: { mode: 'nest', unit: TRIANGLE },
  rank_country: { mode: 'row', unit: PENNANT_S, step: ROW },
  unique_maps: { mode: 'deck', unit: SHEET_S, step: DECK },
  unique_diffs: { mode: 'stack', unit: LAYER_S, step: STACK },
  resubmit: { mode: 'deck', unit: STEP_UP_S, step: STAIR },
  old_score: { mode: 'row', unit: HOURGLASS_S, step: ROW },
  stamina: { mode: 'stack', unit: PULSE_S, step: STACK },
  rock_bottom: { mode: 'row', unit: ARROW_DOWN_S, step: ROW },
  broken_streak: { mode: 'stack', unit: CHEV_DOWN_S, step: STACK },
}

const STAR = 'M18.6 2.6 19.5 4.8 21.8 5 20 6.5 20.6 8.8 18.6 7.5 16.6 8.8 17.2 6.5 15.4 5 17.7 4.8Z'

const STAR_PLACE = 'translate(12 17.9) scale(0.62) translate(-18.6 -6)'

const STAR_SHRINK = 'translate(12 9.4) scale(0.74) translate(-12 -12)'

const NEST_STEP = 0.32

const COUNT_SCALE: Record<number, number> = { 1: 1.45, 2: 1.15, 3: 1 }

export interface GlyphInstance {
  d: string
  fill: boolean
  transform?: string
  scale: number
}

function join(outer: string | undefined, inner: string | undefined): string | undefined {
  if (outer && inner) return `${outer} ${inner}`
  return outer ?? inner
}

function tierIndex(tier: MilestoneFrameTier): number {
  return Math.max(0, MILESTONE_TIERS.indexOf(tier))
}

function offsets(count: number, step: number): number[] {
  return Array.from({ length: count }, (_, i) => (i - (count - 1) / 2) * step)
}

function dot(cx: number, cy: number, r: number): string {
  const d = (2 * r).toFixed(2)
  return `M${(cx + r).toFixed(2)} ${cy.toFixed(2)}a${r} ${r} 0 1 1 -${d} 0a${r} ${r} 0 1 1 ${d} 0`
}

function growthBars(count: number): GlyphInstance[] {
  const width = 2
  const gap = 1.7
  const total = count * width + (count - 1) * gap
  return Array.from({ length: count }, (_, i) => {
    const x = 12 - total / 2 + width / 2 + i * (width + gap)
    const height = 3.4 + (4.2 * i) / Math.max(count - 1, 1)
    return { d: `M${x.toFixed(2)} 15.2V${(15.2 - height).toFixed(2)}`, fill: false, scale: 1 }
  })
}

function orbitParts(spec: GlyphSpec, count: number): GlyphInstance[] {
  const radius = spec.orbitRadius ?? 6
  const dots = Array.from({ length: count }, (_, i) => {
    const angle = (-90 + (360 / count) * i) * (Math.PI / 180)
    return {
      d: dot(12 + radius * Math.cos(angle), 12 + radius * Math.sin(angle), 1.2),
      fill: true,
      scale: 1,
    }
  })
  return [{ d: spec.core ?? '', fill: false, scale: 1 }, ...dots]
}

function repeatParts(spec: GlyphSpec, count: number): GlyphInstance[] {
  const spread = COUNT_SCALE[count] ?? 1
  return offsets(count, spec.step ?? ROW).map((value) => {
    const shift =
      spec.mode === 'stack'
        ? `translate(0 ${(value * spread).toFixed(2)})`
        : `translate(${(value * spread).toFixed(2)} 0)`
    return {
      d: spec.unit,
      fill: !!spec.unitFill,
      transform: `${shift} translate(12 12) scale(${spread}) translate(-12 -12)`,
      scale: spread,
    }
  })
}

function deckParts(spec: GlyphSpec, count: number): GlyphInstance[] {
  return offsets(count, spec.step ?? DECK).map((value) => ({
    d: spec.unit,
    fill: !!spec.unitFill,
    transform: `translate(${value.toFixed(2)} ${(-value).toFixed(2)})`,
    scale: 1,
  }))
}

function rotateParts(spec: GlyphSpec, count: number): GlyphInstance[] {
  return Array.from({ length: count }, (_, i) => ({
    d: spec.unit,
    fill: !!spec.unitFill,
    transform: i === 0 ? undefined : `rotate(${((360 / count) * i).toFixed(1)} 12 12)`,
    scale: 1,
  }))
}

function nestParts(spec: GlyphSpec, depth: number, solidCore: boolean): GlyphInstance[] {
  const rings = Array.from({ length: depth }, (_, i) => {
    const factor = 1 - i * NEST_STEP
    return {
      d: spec.unit,
      fill: false,
      transform:
        i === 0 ? undefined : `translate(12 12) scale(${factor.toFixed(3)}) translate(-12 -12)`,
      scale: factor,
    }
  })
  if (!solidCore) return rings
  const inner = 1 - (depth - 1) * NEST_STEP
  return [...rings, { d: dot(12, 12, Math.max(inner * 2.4, 1)), fill: true, scale: 1 }]
}

function modeParts(spec: GlyphSpec, count: number): GlyphInstance[] {
  if (spec.mode === 'growth') return growthBars(count)
  if (spec.mode === 'orbit') return orbitParts(spec, count)
  if (spec.mode === 'deck') return deckParts(spec, count)
  if (spec.mode === 'rotate') return rotateParts(spec, count)
  return repeatParts(spec, count)
}

export function renderGlyph(key: MilestoneGlyphKey, tier: MilestoneFrameTier): GlyphInstance[] {
  const spec = SPECS[key] ?? SPECS.GENERAL
  const index = tierIndex(tier)

  if (spec.mode === 'nest') return nestParts(spec, (index % 3) + 1, index >= 3)

  const star = index >= 3
  const group = star ? STAR_SHRINK : undefined
  const groupScale = star ? 0.74 : 1

  const out = modeParts(spec, (index % 3) + 1).map((part) => ({
    ...part,
    transform: join(group, part.transform),
    scale: part.scale * groupScale,
  }))

  if (star) out.push({ d: STAR, fill: true, transform: STAR_PLACE, scale: 0.62 })

  return out
}

const GROUP_KEYS = new Set<string>(MILESTONE_ICON_GROUPS)

function resolveIconGroup(raw: string | null | undefined): MilestoneIconGroup {
  if (!raw) return 'GENERAL'
  const key = raw.toUpperCase()
  return GROUP_KEYS.has(key) ? (key as MilestoneIconGroup) : 'GENERAL'
}

interface QueryShape {
  from: string
  fn: string
  column: string
  filters: Set<string>
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function readFilterColumns(raw: unknown): Set<string> {
  const out = new Set<string>()
  if (!Array.isArray(raw)) return out
  for (const entry of raw) {
    if (typeof entry !== 'object' || entry === null) continue
    const column = str((entry as Record<string, unknown>).column)
    if (column) out.add(column)
  }
  return out
}

function readQueryShape(spec: unknown): QueryShape | null {
  if (typeof spec !== 'object' || spec === null) return null
  const record = spec as Record<string, unknown>
  const from = str(record.from)
  if (!from) return null

  const select =
    typeof record.select === 'object' && record.select !== null
      ? (record.select as Record<string, unknown>)
      : {}

  return {
    from,
    fn: str(select.function).toUpperCase(),
    column: str(select.column),
    filters: readFilterColumns(record.filters),
  }
}

function scoreCountGlyph(filters: Set<string>): MilestoneGlyphKey {
  if (filters.has('misses') && filters.has('streak_115')) return 'rock_bottom'
  if (filters.has('misses')) return 'MISTAKE'
  if (filters.has('streak_115')) return 'broken_streak'
  if (filters.has('pauses')) return 'stamina'
  if (filters.has('ap')) return 'plays_ap'
  if (filters.has('rank')) return 'plays_rank'
  if (filters.has('score')) return 'plays_score'
  if (filters.has('supersedes_reason')) return 'resubmit'
  if (filters.has('supersedes_time_set')) return 'old_score'
  if (filters.has('id')) return 'plays_map'
  return 'plays'
}

function scoreGlyph(shape: QueryShape): MilestoneGlyphKey | null {
  const { fn, column, filters } = shape
  if (fn === 'COUNT') return scoreCountGlyph(filters)
  if (fn === 'COUNT_DISTINCT') {
    return column === 'map_difficulty_difficulty' ? 'unique_diffs' : 'unique_maps'
  }
  if (column === 'accuracy') return fn === 'AVG' ? 'avg_acc' : 'best_acc'
  if (column === 'ap' || column === 'weighted_ap') return 'best_ap'
  if (column === 'streak_115') return 'best_streak'
  if (column === 'pauses') return 'pauses'
  if (column === 'rank' || column === 'rank_when_set') return 'rank_best'
  if (
    column === 'misses' ||
    column === 'bad_cuts' ||
    column === 'bomb_hits' ||
    column === 'wall_hits'
  ) {
    return 'MISTAKE'
  }
  return null
}

function statsGlyph(shape: QueryShape): MilestoneGlyphKey | null {
  const { column } = shape
  if (column === 'ranking') return 'RANK'
  if (column === 'country_ranking') return 'rank_country'
  if (column === 'ap' || column === 'average_ap') return 'AP'
  if (column === 'average_acc') return 'avg_acc'
  return null
}

export function resolveMilestoneGlyph(
  iconGroup: string | null | undefined,
  querySpec?: unknown,
): MilestoneGlyphKey {
  const shape = readQueryShape(querySpec)
  if (shape) {
    const fine =
      shape.from === 'scores'
        ? scoreGlyph(shape)
        : shape.from === 'user_category_statistics'
          ? statsGlyph(shape)
          : null
    if (fine) return fine
  }
  return resolveIconGroup(iconGroup)
}

export function glyphSymbolId(key: MilestoneGlyphKey, tier: MilestoneFrameTier): string {
  return `ms-glyph-${key}-${tier}`
}
