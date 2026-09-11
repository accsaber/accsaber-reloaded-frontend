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
    hint: 'The number every map in this category starts from. Raise it and every map here gets more complexity.',
  },
  {
    key: 'meanSlope',
    label: 'Mean',
    kind: 'slope',
    hint: 'How much the average note counts. The model guesses how accurately each note gets hit, and this weights that average.',
  },
  {
    key: 'worstSlope',
    label: 'Worst',
    kind: 'slope',
    hint: "How much the map's hardest notes count, the slice that worst share picks out.",
  },
  {
    key: 'resetSlope',
    label: 'Resets',
    kind: 'slope',
    hint: 'How much wrist resets count. More resets usually means a map is harder to hit clean.',
  },
  {
    key: 'dotSlope',
    label: 'Dots',
    kind: 'slope',
    hint: 'How much dot notes count, the ones with no arrow telling you which way to swing.',
  },
  {
    key: 'notesSlope',
    label: 'Notes',
    kind: 'slope',
    hint: 'How much the map length counts. Doubling the notes moves it by a fixed step, so a long map is not twice a short one.',
  },
  {
    key: 'npsSlope',
    label: 'NPS',
    kind: 'slope',
    hint: 'How much note density counts, meaning how tightly the notes sit over the map length. Negative raises sparse maps, positive lowers them.',
  },
  {
    key: 'njsSlope',
    label: 'NJS',
    kind: 'slope',
    hint: 'How much note jump speed counts, meaning how fast notes fly at you.',
  },
  {
    key: 'boardSlope',
    label: 'Board ease',
    kind: 'slope',
    hint: 'How much the real scores count. Board ease is how easily the top players hit this map.',
  },
]

export const GATE_FIELDS: {
  key: GateKey
  label: string
  kind: FieldKind
  hint: string
  slow?: boolean
}[] = [
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
    key: 'topPlays',
    label: 'Top plays',
    kind: 'count',
    hint: "How many of the map's best plays the ease is read from, each one adjusted for how good the player is.",
    slow: true,
  },
  {
    key: 'minPlayers',
    label: 'Min plays',
    kind: 'count',
    hint: 'How many of those plays the map needs before its leaderboard counts.',
  },
  {
    key: 'minPlayerPlays',
    label: 'Min plays per player',
    kind: 'count',
    hint: "Ranked plays in the category a player needs before their scores count toward any player's level.",
    slow: true,
  },
  {
    key: 'maxNudge',
    label: 'Max nudge',
    kind: 'nudge',
    hint: 'Furthest the leaderboard may move a map from the chart line, either way. 0 removes the limit.',
  },
]

export const SLOW_GATE_NOTE = 'Top plays and min plays per player re-read every leaderboard, so they price on release and take a moment the first time.'

export const WORST_SHARE_HINT = "How much of the map's hardest part the script reads. At 0.05 it looks at the worst 5 percent of notes, so a short brutal section counts for more than a wider slice would let it."

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

function onStep(value: number, step: number): number {
  return Math.round(Math.floor(value / step) * step * 1e6) / 1e6
}

export function fieldRange(kind: FieldKind, live: number, current: number): FieldRange {
  if (kind === 'share') return { min: 0.005, max: 0.5, step: 0.005 }
  if (kind === 'count') {
    return { min: 0, max: niceCeil(Math.max(live, current, 1) * 4), step: 1 }
  }
  if (kind === 'nudge') {
    return { min: 0, max: niceCeil(Math.max(live, current, 1) * 4), step: 0.05 }
  }
  const span = niceCeil(
    Math.max(BASE_SPAN[kind], Math.abs(live) * 0.5, Math.abs(current - live) * 1.2),
  )
  const step = 0.001
  return { min: onStep(live - span, step), max: live + span, step }
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
