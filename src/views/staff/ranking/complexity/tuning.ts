import type {
  ComplexityRaterSpec,
  RaterBoardGate,
  RaterCoefficients,
} from '@/types/api/complexity'
import { ref, type Ref } from 'vue'

export type CoefficientKey = keyof RaterCoefficients

export type GateKey = keyof RaterBoardGate

export const COEFFICIENT_FIELDS: { key: CoefficientKey; label: string }[] = [
  { key: 'intercept', label: 'Intercept' },
  { key: 'meanSlope', label: 'Mean' },
  { key: 'worstSlope', label: 'Worst' },
  { key: 'resetSlope', label: 'Resets' },
  { key: 'dotSlope', label: 'Dots' },
  { key: 'notesSlope', label: 'Notes' },
  { key: 'njsSlope', label: 'NJS' },
  { key: 'boardSlope', label: 'Board ease' },
]

export const GATE_FIELDS: { key: GateKey; label: string; step: number }[] = [
  { key: 'minScores', label: 'Min scores', step: 1 },
  { key: 'fullScores', label: 'Full scores', step: 1 },
  { key: 'minPlayers', label: 'Min players', step: 1 },
  { key: 'minPlayerPlays', label: 'Min plays per player', step: 1 },
  { key: 'maxNudge', label: 'Max nudge', step: 0.01 },
]

export const SLOPE_STEP = 0.001
export const SHARE_STEP = 0.01

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
