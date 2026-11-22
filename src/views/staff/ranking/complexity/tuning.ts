import type {
  ComplexityRaterSpec,
  RaterPayFair,
  RaterCoefficients,
} from '@/types/api/complexity'
import { computed, type ComputedRef, ref, type Ref } from 'vue'

export type FieldKind = 'intercept' | 'slope' | 'count' | 'threshold' | 'percent'

type CountKind = 'count' | 'threshold'

export interface FieldRange {
  min: number
  max: number
  step: number
}

export const COEFFICIENT_FIELDS: {
  key: keyof RaterCoefficients
  label: string
  kind: FieldKind
  hint: string
}[] = [
  {
    key: 'intercept',
    label: 'Intercept',
    kind: 'intercept',
    hint: 'Where every map in this category starts. Raise it and they all go up.',
  },
  {
    key: 'meanSlope',
    label: 'Mean',
    kind: 'slope',
    hint: 'The bot guesses how accurately every note gets hit. This is how much that average counts.',
  },
  {
    key: 'resetSlope',
    label: 'Resets',
    kind: 'slope',
    hint: 'How much wrist resets count.',
  },
  {
    key: 'dotSlope',
    label: 'Dots',
    kind: 'slope',
    hint: 'Dot notes are the ones with no arrow. Higher gives more complexity to maps full of them.',
  },
  {
    key: 'bottomUpSlope',
    label: 'Bottom-Row Ups',
    kind: 'slope',
    hint: 'Upswings on the bottom row. The bot reads them harder than they play so a negative number brings those maps back down.',
  },
  {
    key: 'crossoverSlope',
    label: 'Crossovers',
    kind: 'slope',
    hint: 'How much notes you hit with your arms crossed count.',
  },
  {
    key: 'topRowSlope',
    label: 'Top Row',
    kind: 'slope',
    hint: 'Higher gives more complexity to maps with lots of top row notes.',
  },
  {
    key: 'diagonalSlope',
    label: 'Diagonals',
    kind: 'slope',
    hint: 'How much diagonal cuts count.',
  },
  {
    key: 'verticalStackSlope',
    label: 'Vertical Stacks',
    kind: 'slope',
    hint: 'Notes stacked on top of each other and how much they count.',
  },
  {
    key: 'outerSlope',
    label: 'Outer Notes',
    kind: 'slope',
    hint: 'How much notes in the two outer columns count.',
  },
  {
    key: 'notesSlope',
    label: 'Notes',
    kind: 'slope',
    hint: "How much the map's length counts. Twice the notes adds a fixed amount so a long map isn't worth double a short one.",
  },
  {
    key: 'njsSlope',
    label: 'NJS',
    kind: 'slope',
    hint: 'How much it counts when notes come at you faster.',
  },
]

interface PayFairField {
  key: Exclude<keyof RaterPayFair, 'maxWeight'>
  label: string
  kind: FieldKind
  hint: string
}

export const WEIGHT_HINT = "How much of a map's complexity comes from pay-fair once it has enough scores. The bot gets the rest."

export const SCORE_FIELDS: PayFairField[] = [
  {
    key: 'minScores',
    label: 'Min Scores',
    kind: 'threshold',
    hint: 'Pay-fair starts counting when a map has this many scores.',
  },
  {
    key: 'fullScores',
    label: 'Full Scores',
    kind: 'count',
    hint: "Pay-fair gets to the slider's share at this many scores and stays there.",
  },
]

export const PLAY_FIELDS: PayFairField[] = [
  {
    key: 'minPlayerPlays',
    label: 'Min Plays per Player',
    kind: 'count',
    hint: 'A player needs this many plays in the category before we know what they usually get.',
  },
  {
    key: 'topPlays',
    label: 'Top Plays',
    kind: 'count',
    hint: "How many of a map's best plays we look at.",
  },
  {
    key: 'usualPlays',
    label: 'Usual Plays',
    kind: 'count',
    hint: "A player's usual is the middle one of this many of their best plays on other maps.",
  },
  {
    key: 'minPlays',
    label: 'Min Plays',
    kind: 'count',
    hint: "A map needs this many top plays from players with a usual or it doesn't get a reading.",
  },
]

export const BOT_ESTIMATE_HINT = "What the bot thinks a map's complexity is from the chart alone. It's all a new map has."

export const PAY_FAIR_HINT = "Checks if a map's best plays give more or less AP than those players usually get and adjusts the map to even it out. The four play settings take a moment to preview."

const NICE_STEPS = [0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000]

const BASE_SPAN = { intercept: 5, slope: 2 }

const COUNT_FLOOR: Record<CountKind, number> = { count: 1, threshold: 0 }

export function countFloor(kind: FieldKind): number | null {
  return kind in COUNT_FLOOR ? COUNT_FLOOR[kind as CountKind] : null
}

function niceCeil(value: number): number {
  return NICE_STEPS.find((step) => step >= value) ?? NICE_STEPS[NICE_STEPS.length - 1]
}

function onStep(value: number, step: number): number {
  return Math.round(Math.floor(value / step) * step * 1e6) / 1e6
}

export function fieldRange(kind: FieldKind, live: number, current: number): FieldRange {
  if (kind === 'percent') return { min: 0, max: 100, step: 5 }
  if (kind === 'count' || kind === 'threshold') {
    return { min: COUNT_FLOOR[kind], max: niceCeil(Math.max(live, current, 1) * 4), step: 1 }
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
    payFair: { ...rater.payFair },
    categories: Object.fromEntries(
      Object.entries(rater.categories).map(([code, values]) => [code, { ...values }]),
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
