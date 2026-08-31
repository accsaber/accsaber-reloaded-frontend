import type {
  CampaignBackgroundPlacement,
  CampaignDifficultyResponse,
  CampaignNodeShape,
  CampaignPrerequisiteResponse,
} from '@/types/api/campaigns'
import type { CampaignPrerequisiteInput } from '@/types/api/admin'
import type { BarrierConditionType, CampaignRequirementType } from '@/types/enums'
import { hexProjection, roundToPrecision, SQRT3, type ContentRect } from '@/utils/stageLayout'

export const MAX_PREREQUISITES_PER_NODE = 25

export const CONNECTION_COLOR_RE = /^$|^#?[A-Za-z0-9]{1,32}$/

export function prereqIds(
  prerequisites: CampaignPrerequisiteResponse[] | null | undefined,
): string[] {
  return (prerequisites ?? []).map((p) => p.comesFromCampaignDifficultyId)
}

export function toPrerequisiteInputs(
  prerequisites: CampaignPrerequisiteResponse[],
): CampaignPrerequisiteInput[] {
  return prerequisites.map((p) => ({
    comesFromCampaignDifficultyId: p.comesFromCampaignDifficultyId,
    ...(p.color ? { color: p.color } : {}),
  }))
}

export function resolveConnectionColor(color: string | null | undefined): string | null {
  const v = color?.trim()
  if (!v) return null
  if (/^[0-9a-fA-F]{3}$/.test(v) || /^[0-9a-fA-F]{6}$/.test(v) || /^[0-9a-fA-F]{8}$/.test(v)) {
    return `#${v}`
  }
  return v
}

const SHAPE_VALUES: ReadonlyArray<CampaignNodeShape> = ['hex', 'square', 'circle', 'diamond']

export function resolveShape(raw: string | null | undefined): CampaignNodeShape {
  if (!raw) return 'hex'
  const v = raw.toLowerCase()
  return (SHAPE_VALUES as readonly string[]).includes(v) ? (v as CampaignNodeShape) : 'hex'
}

export function resolveSize(raw: number | null | undefined, fallback: number): number {
  return raw != null && raw > 0 ? raw : fallback
}

export function isMilestoneNode(node: CampaignDifficultyResponse): boolean {
  return !!node.checkpointLabel?.trim()
}

export function backgroundPlacementStyle(
  url: string,
  placement: CampaignBackgroundPlacement | null | undefined,
): Record<string, string> {
  const style: Record<string, string> = { backgroundImage: `url(${url})` }
  if (!placement) return style
  style.backgroundSize = `${placement.size}%`
  style.backgroundPosition = `${placement.x}% ${placement.y}%`
  style.backgroundRepeat = 'no-repeat'
  return style
}

export interface BackgroundFrame {
  view: ContentRect
  content: ContentRect
  unit: number
}

export const MAX_BACKGROUND_PERCENT = 1000

export const MAX_BACKGROUND_CELLS = 1000

export const BACKGROUND_REFERENCE_COLUMNS = 20

export function backgroundReferenceSpan(unit: number): number {
  return unit * 1.5 * BACKGROUND_REFERENCE_COLUMNS
}

export function clampBackgroundSize(value: number): number {
  return roundToPrecision(Math.min(MAX_BACKGROUND_PERCENT, Math.max(1, value)))
}

export function clampBackgroundOffset(value: number): number {
  return roundToPrecision(Math.min(MAX_BACKGROUND_CELLS, Math.max(-MAX_BACKGROUND_CELLS, value)))
}

export function pinnedBackgroundRect(
  placement: CampaignBackgroundPlacement,
  aspect: number,
  unit: number,
): ContentRect {
  const { cx, cy } = hexProjection.toContent(placement.x, placement.y, unit)
  const width = (backgroundReferenceSpan(unit) * placement.size) / 100
  const height = width / (aspect > 0 ? aspect : 1)
  return {
    x: cx - width / 2,
    y: cy - height / 2,
    width,
    height,
  }
}

export function suggestBackgroundPlacement(
  content: ContentRect,
  aspect: number,
  unit: number,
): CampaignBackgroundPlacement {
  const span = backgroundReferenceSpan(unit)
  const safeAspect = aspect > 0 ? aspect : 1
  const width = Math.max(content.width, content.height * safeAspect)
  const { positionX, positionY } = hexProjection.toGrid(
    content.x + content.width / 2,
    content.y + content.height / 2,
    unit,
    false,
  )
  return {
    size: clampBackgroundSize((width / span) * 100),
    x: clampBackgroundOffset(positionX),
    y: clampBackgroundOffset(positionY),
  }
}

export function hexCorners(cx: number, cy: number, size: number): string {
  const pts: string[] = []
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i
    const x = cx + size * Math.cos(angle)
    const y = cy + size * Math.sin(angle)
    pts.push(`${x.toFixed(2)},${y.toFixed(2)}`)
  }
  return pts.join(' ')
}

export function shapeCorners(
  shape: CampaignNodeShape,
  cx: number,
  cy: number,
  size: number,
): string {
  if (shape === 'hex') return hexCorners(cx, cy, size)
  if (shape === 'square') {
    const s = size * 0.95
    return [
      `${(cx - s).toFixed(2)},${(cy - s).toFixed(2)}`,
      `${(cx + s).toFixed(2)},${(cy - s).toFixed(2)}`,
      `${(cx + s).toFixed(2)},${(cy + s).toFixed(2)}`,
      `${(cx - s).toFixed(2)},${(cy + s).toFixed(2)}`,
    ].join(' ')
  }
  if (shape === 'diamond') {
    const s = size * 1.05
    return [
      `${cx.toFixed(2)},${(cy - s).toFixed(2)}`,
      `${(cx + s).toFixed(2)},${cy.toFixed(2)}`,
      `${cx.toFixed(2)},${(cy + s).toFixed(2)}`,
      `${(cx - s).toFixed(2)},${cy.toFixed(2)}`,
    ].join(' ')
  }
  return hexCorners(cx, cy, size)
}

export function edgePointOnShape(
  shape: CampaignNodeShape,
  size: number,
  cx: number,
  cy: number,
  towardX: number,
  towardY: number,
): { x: number; y: number } {
  const dx = towardX - cx
  const dy = towardY - cy
  const len = Math.hypot(dx, dy)
  if (len === 0) return { x: cx, y: cy }
  const ux = dx / len
  const uy = dy / len

  let r: number
  switch (shape) {
    case 'circle':
      r = size
      break
    case 'square': {
      const half = size * 0.95
      r = half / Math.max(Math.abs(ux), Math.abs(uy))
      break
    }
    case 'diamond': {
      const vertex = size * 1.05
      r = vertex / (Math.abs(ux) + Math.abs(uy))
      break
    }
    case 'hex':
    default: {
      const angle = Math.atan2(uy, ux)
      const sector = ((angle + 2 * Math.PI) % (Math.PI / 3)) - Math.PI / 6
      r = (size * SQRT3) / (2 * Math.cos(sector))
      break
    }
  }
  return { x: cx + ux * r, y: cy + uy * r }
}

export function formatScoreCompact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k`
  return String(Math.round(value))
}

interface RequirementDisplay {
  label: string
  format: (value: number) => string
  lowerBetter?: boolean
  flag?: boolean
}

const REQUIREMENT_DISPLAY: Record<CampaignRequirementType, RequirementDisplay> = {
  ACC: { label: 'Accuracy', format: (v) => `${(v * 100).toFixed(2)}%` },
  AP: { label: 'AP', format: (v) => `${Math.round(v)}` },
  SCORE: { label: 'Score', format: formatScoreCompact },
  STREAK_115: { label: '115 streak', format: (v) => `${Math.round(v)}` },
  FC: { label: 'Full combo', format: () => 'Required', flag: true },
  PASS: { label: 'Pass', format: () => 'Required', flag: true },
  RANK: { label: 'Rank', format: (v) => `#${Math.round(v)}`, lowerBetter: true },
  COMBO: { label: 'Combo', format: (v) => `${Math.round(v)}` },
  BOMB_HITS: { label: 'Bombs', format: (v) => `${Math.round(v)}` },
  MISTAKES: { label: 'Mistakes', format: (v) => `${Math.round(v)}` },
  PAUSES: { label: 'Pauses', format: (v) => `${Math.round(v)}` },
}

export function requirementLabel(type: CampaignRequirementType): string {
  return REQUIREMENT_DISPLAY[type].label
}

export function formatUserValue(type: CampaignRequirementType, value: number | null): string {
  if (value == null) return '-'
  if (type === 'FC') return value > 0 ? 'Cleared' : 'Not yet'
  if (type === 'PASS') return value > 0 ? 'Passed' : 'Not yet'
  return REQUIREMENT_DISPLAY[type].format(value)
}

export function hasValidBounds(value: number | null, valueMax: number | null): boolean {
  if (value == null && valueMax == null) return false
  if (value != null && valueMax != null) return value <= valueMax
  return true
}

export interface BoundsReadout {
  label: string
  text: string
  inline: string
}

interface BoundsLabels {
  lower: string
  upper: string
  range: string
}

function boundsInline(
  format: (value: number) => string,
  lower: number | null,
  upper: number | null,
  lowerBetter: boolean,
): string {
  if (lower != null && upper != null) return `${format(lower)} - ${format(upper)}`
  if (upper != null) return `≤ ${format(upper)}`
  if (lower == null) return '-'
  return lowerBetter ? `≤ ${format(lower)}` : format(lower)
}

function boundsReadout(
  format: (value: number) => string,
  lower: number | null,
  upper: number | null,
  labels: BoundsLabels,
  lowerBetter = false,
): BoundsReadout {
  const inline = boundsInline(format, lower, upper, lowerBetter)
  if (lower != null && upper != null) return { label: labels.range, text: inline, inline }
  if (upper != null) return { label: labels.upper, text: format(upper), inline }
  if (lower == null) return { label: labels.lower, text: '-', inline }
  return { label: labels.lower, text: format(lower), inline }
}

export function requirementGoalText(
  type: CampaignRequirementType,
  value: number | null,
  valueMax: number | null,
): string {
  const display = REQUIREMENT_DISPLAY[type]
  if (display.flag) return display.format(1)
  return boundsInline(display.format, value, valueMax, display.lowerBetter ?? false)
}

type BarrierMetric =
  | 'acc'
  | 'ap'
  | 'streak'
  | 'rank'
  | 'fc'
  | 'count'
  | 'combo'
  | 'bombs'
  | 'mistakes'
  | 'pauses'

interface BarrierConditionMeta {
  agg: string
  metric: BarrierMetric
  lowerBetter: boolean
  noValue: boolean
  label: string
}

const BARRIER_CONDITION_META: Record<BarrierConditionType, BarrierConditionMeta> = {
  AVERAGE_ACC: {
    agg: 'avg',
    metric: 'acc',
    lowerBetter: false,
    noValue: false,
    label: 'Average accuracy',
  },
  ACC_MAX: {
    agg: 'best',
    metric: 'acc',
    lowerBetter: false,
    noValue: false,
    label: 'Best accuracy',
  },
  AVERAGE_AP: { agg: 'avg', metric: 'ap', lowerBetter: false, noValue: false, label: 'Average AP' },
  AP_MAX: { agg: 'best', metric: 'ap', lowerBetter: false, noValue: false, label: 'Best AP' },
  STREAK_115_AVERAGE: {
    agg: 'avg',
    metric: 'streak',
    lowerBetter: false,
    noValue: false,
    label: 'Average 115 streak',
  },
  STREAK_115_MAX: {
    agg: 'best',
    metric: 'streak',
    lowerBetter: false,
    noValue: false,
    label: 'Best 115 streak',
  },
  AVERAGE_RANK: {
    agg: 'avg',
    metric: 'rank',
    lowerBetter: true,
    noValue: false,
    label: 'Average rank',
  },
  MAX_RANK: { agg: 'best', metric: 'rank', lowerBetter: true, noValue: false, label: 'Best rank' },
  AVERAGE_COMBO: {
    agg: 'avg',
    metric: 'combo',
    lowerBetter: false,
    noValue: false,
    label: 'Average combo',
  },
  AVERAGE_BOMB_HITS: {
    agg: 'avg',
    metric: 'bombs',
    lowerBetter: false,
    noValue: false,
    label: 'Average bombs hit',
  },
  AVERAGE_MISTAKES: {
    agg: 'avg',
    metric: 'mistakes',
    lowerBetter: false,
    noValue: false,
    label: 'Average mistakes',
  },
  AVERAGE_PAUSES: {
    agg: 'avg',
    metric: 'pauses',
    lowerBetter: false,
    noValue: false,
    label: 'Average pauses',
  },
  FC: { agg: '', metric: 'fc', lowerBetter: false, noValue: true, label: 'Full combo' },
  PASS: { agg: '', metric: 'fc', lowerBetter: false, noValue: true, label: 'Pass (no No-Fail)' },
  COMPLETION_COUNT: {
    agg: 'count',
    metric: 'count',
    lowerBetter: false,
    noValue: false,
    label: 'Maps completed',
  },
}

export function barrierConditionMeta(type: BarrierConditionType): BarrierConditionMeta {
  return BARRIER_CONDITION_META[type]
}

const BARRIER_READOUT_LABEL: Record<BarrierConditionType, string> = {
  AVERAGE_ACC: 'Avg Accuracy',
  ACC_MAX: 'Best Accuracy',
  AVERAGE_AP: 'Avg AP',
  AP_MAX: 'Best AP',
  STREAK_115_AVERAGE: 'Avg 115 Streak',
  STREAK_115_MAX: 'Best 115 Streak',
  AVERAGE_RANK: 'Avg Rank',
  MAX_RANK: 'Best Rank',
  AVERAGE_COMBO: 'Avg Combo',
  AVERAGE_BOMB_HITS: 'Avg Bombs',
  AVERAGE_MISTAKES: 'Avg Mistakes',
  AVERAGE_PAUSES: 'Avg Pauses',
  FC: 'Full Combo',
  PASS: 'Pass',
  COMPLETION_COUNT: 'Maps Completed',
}

export function barrierConditionLabel(type: BarrierConditionType): string {
  return BARRIER_READOUT_LABEL[type]
}

export function barrierPairValue(type: BarrierConditionType, value: number | null): string {
  if (value == null) return '-'
  if (BARRIER_CONDITION_META[type].metric === 'acc') return `${(value * 100).toFixed(2)}%`
  if (BARRIER_CONDITION_META[type].metric === 'fc') return ''
  return `${Math.round(value)}`
}

export function barrierGoalValue(type: BarrierConditionType, value: number | null): string {
  const base = barrierPairValue(type, value)
  if (value == null) return base
  return BARRIER_CONDITION_META[type].metric === 'rank' ? `Rank ${base}` : base
}

const BARRIER_LABELS: BoundsLabels = {
  lower: 'Goal',
  upper: 'Limit',
  range: 'Goal range',
}

export function barrierReadout(
  type: BarrierConditionType,
  value: number | null,
  valueMax: number | null,
): BoundsReadout {
  const meta = BARRIER_CONDITION_META[type]
  if (meta.noValue) return { label: BARRIER_LABELS.lower, text: meta.label, inline: meta.label }
  const readout = boundsReadout(
    (v) => barrierPairValue(type, v),
    value,
    valueMax,
    BARRIER_LABELS,
    meta.lowerBetter,
  )
  if (meta.metric !== 'rank') return readout
  return {
    label: readout.label,
    text: `Rank ${readout.text}`,
    inline: `Rank ${readout.inline}`,
  }
}
