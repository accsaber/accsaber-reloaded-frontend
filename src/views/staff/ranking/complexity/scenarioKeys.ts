import type { ComplexityScenario } from '@/types/api/complexity'
import type { SortDirection } from '@/types/display'

const CX_KEYS: Record<ComplexityScenario, string> = {
  CURRENT: 'cxCurrent',
  NEW_SCRIPT: 'cxScript',
  PREVIEW: 'cxPreview',
}

const AP_KEYS: Record<ComplexityScenario, string> = {
  CURRENT: 'apCurrent',
  NEW_SCRIPT: 'apScript',
  PREVIEW: 'apPreview',
}

export function cxKey(scenario: ComplexityScenario): string {
  return CX_KEYS[scenario]
}

export function apKey(scenario: ComplexityScenario): string {
  return AP_KEYS[scenario]
}

export interface ScenarioSortRequest {
  sort: string
  absolute?: boolean
}

const MAP_SORT_FIELDS: Record<string, string> = {
  song: 'song',
  mapper: 'mapper',
  cxCurrent: 'currentComplexity',
  cxScript: 'scenarioComplexity',
  cxPreview: 'scenarioComplexity',
  cxDelta: 'complexityDelta',
  topApCurrent: 'currentTopAp',
  topAp: 'scenarioTopAp',
  topApDelta: 'topApDelta',
  avgWeightedCurrent: 'currentAverageWeightedAp',
  avgWeighted: 'scenarioAverageWeightedAp',
  avgWeightedDelta: 'averageWeightedApDelta',
  scores: 'scores',
}

const LEADERBOARD_SORT_FIELDS: Record<string, string> = {
  rank: 'rank',
  accuracy: 'accuracy',
  apCurrent: 'currentAp',
  apScenario: 'scenarioAp',
  apMove: 'apDelta',
  weightedCurrent: 'currentWeightedAp',
  weightedScenario: 'scenarioWeightedAp',
  weightedMove: 'weightedApDelta',
}

export const MAP_DELTA_KEYS = ['cxDelta', 'topApDelta', 'avgWeightedDelta'] as const
export const MAP_SORT_KEY = 'cxDelta'
export const MAP_ASCENDING_KEYS = ['song', 'mapper'] as const

export const LEADERBOARD_DELTA_KEYS = ['apMove', 'weightedMove'] as const
export const LEADERBOARD_SORT_KEY = 'rank'
export const LEADERBOARD_ASCENDING_KEYS = ['rank'] as const

function sortRequest(
  fields: Record<string, string>,
  fallback: string,
  key: string,
  direction: SortDirection,
  absolute: boolean,
): ScenarioSortRequest {
  const field = fields[key] ?? fields[fallback]
  return { sort: `${field},${direction}`, absolute: absolute || undefined }
}

export function mapSortRequest(
  key: string,
  direction: SortDirection,
  absolute: boolean,
): ScenarioSortRequest {
  return sortRequest(MAP_SORT_FIELDS, MAP_SORT_KEY, key, direction, absolute)
}

export function leaderboardSortRequest(
  key: string,
  direction: SortDirection,
  absolute: boolean,
): ScenarioSortRequest {
  return sortRequest(LEADERBOARD_SORT_FIELDS, LEADERBOARD_SORT_KEY, key, direction, absolute)
}

export const DEFAULT_MAP_SORT = mapSortRequest(MAP_SORT_KEY, 'desc', true)

export const DEFAULT_LEADERBOARD_SORT = leaderboardSortRequest(LEADERBOARD_SORT_KEY, 'asc', false)
