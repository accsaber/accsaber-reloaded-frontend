import type {
  ComplexityRaterSpec,
  RaterBoardGate,
  RaterCoefficients,
} from '@/types/api/complexity'
import { computed, type ComputedRef, ref, type Ref } from 'vue'

export type CoefficientKey = keyof RaterCoefficients

export type GateKey = keyof RaterBoardGate

export type FieldKind = 'intercept' | 'slope' | 'count' | 'nudge'

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
    key: 'bottomUpSlope',
    label: 'Bottom-Row Ups',
    kind: 'slope',
    hint: 'How much bottom-row notes cut upward count. The model reads those as harder than they play, so a negative value pulls those maps back down.',
  },
  {
    key: 'notesSlope',
    label: 'Notes',
    kind: 'slope',
    hint: 'How much the map length counts. Doubling the notes moves it by a fixed step, so a long map is not twice a short one.',
  },
  {
    key: 'njsSlope',
    label: 'NJS',
    kind: 'slope',
    hint: 'How much note jump speed counts, meaning how fast notes fly at you.',
  },
  {
    key: 'boardSlope',
    label: 'Board Ease',
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
    label: 'Min Scores',
    kind: 'count',
    hint: 'Scores a map needs before its leaderboard counts.',
  },
  {
    key: 'fullScores',
    label: 'Full Scores',
    kind: 'count',
    hint: 'Scores at which the leaderboard counts in full.',
  },
  {
    key: 'topPlays',
    label: 'Top Plays',
    kind: 'count',
    hint: "How many of the map's best plays the ease is read from, each one adjusted for how good the player is.",
    slow: true,
  },
  {
    key: 'minPlayers',
    label: 'Min Plays',
    kind: 'count',
    hint: 'How many of those plays the map needs before its leaderboard counts.',
  },
  {
    key: 'minPlayerPlays',
    label: 'Min Plays per Player',
    kind: 'count',
    hint: "Ranked plays in the category a player needs before their scores count toward any player's level.",
    slow: true,
  },
  {
    key: 'maxNudge',
    label: 'Max Nudge',
    kind: 'nudge',
    hint: 'Furthest the leaderboard may move a map from the chart line, either way. 0 removes the limit.',
  },
]

export const SLOW_GATE_NOTE = 'Top plays and min plays per player re-read every leaderboard, so they weight on release and take a moment the first time.'

const NICE_STEPS = [0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000]

const BASE_SPAN = { intercept: 5, slope: 2 }

function niceCeil(value: number): number {
  return NICE_STEPS.find((step) => step >= value) ?? NICE_STEPS[NICE_STEPS.length - 1]
}

function onStep(value: number, step: number): number {
  return Math.round(Math.floor(value / step) * step * 1e6) / 1e6
}

export function fieldRange(kind: FieldKind, live: number, current: number): FieldRange {
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
const version = ref('')

const dirty = computed(
  () => !!live.value && !!edited.value
    && JSON.stringify(live.value) !== JSON.stringify(edited.value),
)

function cloneRater(rater: ComplexityRaterSpec): ComplexityRaterSpec {
  return {
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
  version: Ref<string>
  adopt: (spec: ComplexityRaterSpec, raterVersion: string) => void
  reset: () => void
  dirty: ComputedRef<boolean>
} {
  function adopt(spec: ComplexityRaterSpec, raterVersion: string) {
    live.value = cloneRater(spec)
    version.value = raterVersion
    if (!edited.value) edited.value = cloneRater(spec)
  }

  function reset() {
    edited.value = live.value ? cloneRater(live.value) : null
  }

  return { live, edited, version, adopt, reset, dirty }
}

export function categoryCodes(rater: ComplexityRaterSpec): string[] {
  const codes = new Set([
    ...Object.keys(rater.categories),
    ...Object.keys(rater.boardCategories),
  ])
  return [...codes]
}
