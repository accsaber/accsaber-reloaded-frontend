import type {
  ComplexityRaterSpec,
  RaterBoardGate,
  RaterCoefficients,
} from '@/types/api/complexity'
import { ref, type Ref } from 'vue'

export type CoefficientKey = keyof RaterCoefficients

export type GateKey = keyof RaterBoardGate

export type FieldKind = 'intercept' | 'slope' | 'share' | 'count' | 'nudge'

export interface FieldRange {
  min: number
  max: number
  step: number
}

export const COEFFICIENT_FIELDS: {
  key: CoefficientKey
  label: string
  kind: FieldKind
  hint: string
}[] = [
  {
    key: 'intercept',
    label: 'Intercept',
    kind: 'intercept',
    hint: 'Where the line starts before any term moves it.',
  },
  {
    key: 'meanSlope',
    label: 'Mean',
    kind: 'slope',
    hint: 'Weight on the mean note accuracy the model predicts.',
  },
  {
    key: 'worstSlope',
    label: 'Worst',
    kind: 'slope',
    hint: 'Weight on the accuracy of the worst share of notes.',
  },
  {
    key: 'resetSlope',
    label: 'Resets',
    kind: 'slope',
    hint: 'Weight on the share of notes that need a reset.',
  },
  {
    key: 'dotSlope',
    label: 'Dots',
    kind: 'slope',
    hint: 'Weight on the share of dot notes.',
  },
  {
    key: 'notesSlope',
    label: 'Notes',
    kind: 'slope',
    hint: 'Weight on the note count, on a log scale.',
  },
  {
    key: 'njsSlope',
    label: 'NJS',
    kind: 'slope',
    hint: 'Weight on the note jump speed.',
  },
  {
    key: 'boardSlope',
    label: 'Board ease',
    kind: 'slope',
    hint: 'Weight on how easily the top players score on the map.',
  },
]

export const GATE_FIELDS: { key: GateKey; label: string; kind: FieldKind; hint: string }[] = [
  {
    key: 'minScores',
    label: 'Min scores',
    kind: 'count',
    hint: 'Scores a map needs before its leaderboard counts.',
  },
  {
    key: 'fullScores',
    label: 'Full scores',
    kind: 'count',
    hint: 'Scores at which the leaderboard counts in full.',
  },
  {
    key: 'topPlayers',
    label: 'Top players',
    kind: 'count',
    hint: "How many of the category's best players, by fitted skill, the leaderboard ease is read from.",
  },
  {
    key: 'minPlayers',
    label: 'Min players',
    kind: 'count',
    hint: 'How many of those players need a score on the map.',
  },
  {
    key: 'minPlayerPlays',
    label: 'Min plays per player',
    kind: 'count',
    hint: "Ranked plays in the category a player needs before their scores count toward any player's level.",
  },
  {
    key: 'maxNudge',
    label: 'Max nudge',
    kind: 'nudge',
    hint: 'Furthest the leaderboard may move a map from the chart line, either way. 0 removes the limit.',
  },
]

export const WORST_SHARE_HINT = 'Share of the worst notes on the map that the worst term reads.'

const NICE_STEPS = [0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000]

const BASE_SPAN: Record<FieldKind, number> = {
  intercept: 5,
  slope: 2,
  share: 0,
  count: 0,
  nudge: 0,
}

function niceCeil(value: number): number {
  return NICE_STEPS.find((step) => step >= value) ?? NICE_STEPS[NICE_STEPS.length - 1]
}

export function fieldRange(kind: FieldKind, live: number, current: number): FieldRange {
  if (kind === 'share') return { min: 0.005, max: 0.5, step: 0.005 }
  if (kind === 'count') {
    return { min: 0, max: niceCeil(Math.max(live, current, 1) * 2), step: 1 }
  }
  if (kind === 'nudge') {
    return { min: 0, max: niceCeil(Math.max(live, current, 1) * 2), step: 0.05 }
  }
  const span = niceCeil(
    Math.max(BASE_SPAN[kind], Math.abs(live) * 0.5, Math.abs(current - live) * 1.2),
  )
  return { min: live - span, max: live + span, step: 0.001 }
}

const live = ref<ComplexityRaterSpec | null>(null)
const edited = ref<ComplexityRaterSpec | null>(null)
const bands = ref<number[]>([])
const version = ref('')

export function cloneRater(rater: ComplexityRaterSpec): ComplexityRaterSpec {
  return {
    worstShare: rater.worstShare,
    board: { ...rater.board },
    categories: Object.fromEntries(
      Object.entries(rater.categories).map(([code, values]) => [code, { ...values }]),
    ),
    boardCategories: Object.fromEntries(
      Object.entries(rater.boardCategories).map(([code, values]) => [code, { ...values }]),
    ),
  }
}

export function useTuningState(): {
  live: Ref<ComplexityRaterSpec | null>
  edited: Ref<ComplexityRaterSpec | null>
  bands: Ref<number[]>
  version: Ref<string>
  adopt: (spec: ComplexityRaterSpec, worstBands: number[], raterVersion: string) => void
  reset: () => void
  dirty: () => boolean
} {
  function adopt(spec: ComplexityRaterSpec, worstBands: number[], raterVersion: string) {
    live.value = cloneRater(spec)
    bands.value = worstBands
    version.value = raterVersion
    if (!edited.value) edited.value = cloneRater(spec)
  }

  function reset() {
    edited.value = live.value ? cloneRater(live.value) : null
  }

  function dirty(): boolean {
    if (!live.value || !edited.value) return false
    return JSON.stringify(live.value) !== JSON.stringify(edited.value)
  }

  return { live, edited, bands, version, adopt, reset, dirty }
}

export function nearestBand(share: number, worstBands: number[]): number | null {
  if (!worstBands.length) return null
  return worstBands.reduce((closest, band) =>
    Math.abs(band - share) < Math.abs(closest - share) ? band : closest,
  )
}

export function categoryCodes(rater: ComplexityRaterSpec): string[] {
  const codes = new Set([
    ...Object.keys(rater.categories),
    ...Object.keys(rater.boardCategories),
  ])
  return [...codes]
}
