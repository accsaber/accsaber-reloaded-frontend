import type { ComplexityEstimateInfo, EstimateScenario } from '@/types/api/complexity'

export interface EstimateField {
  key: string
  label: string
  format: 'percent' | 'number' | 'count'
  decimals?: number
  always?: boolean
}

export interface EstimateGroup {
  key: string
  title: string
  fields: EstimateField[]
}

export const ESTIMATE_GROUPS: Record<EstimateScenario, EstimateGroup[]> = {
  NEW_SCRIPT: [
    {
      key: 'notes',
      title: 'Note terms',
      fields: [
        { key: 'meanNoteAccuracy', label: 'Mean note accuracy', format: 'percent' },
        { key: 'meanTerm', label: 'Mean term', format: 'number', decimals: 4 },
        { key: 'notes', label: 'Notes', format: 'count' },
        { key: 'notesTerm', label: 'Notes term', format: 'number', decimals: 4 },
        { key: 'njs', label: 'Note jump speed', format: 'number', decimals: 2 },
      ],
    },
    {
      key: 'swings',
      title: 'Swing shares',
      fields: [
        { key: 'resetShare', label: 'Resets', format: 'percent' },
        { key: 'dotShare', label: 'Dots', format: 'percent' },
        { key: 'bottomUpShare', label: 'Bottom-row ups', format: 'percent', always: true },
      ],
    },
    {
      key: 'board',
      title: 'Board',
      fields: [
        { key: 'boardEase', label: 'Board ease', format: 'number', decimals: 4 },
        { key: 'boardPlayers', label: 'Top players on map', format: 'count' },
        { key: 'scores', label: 'Scores', format: 'count' },
        { key: 'boardWeight', label: 'Board weight', format: 'percent' },
        { key: 'chartComplexity', label: 'Chart complexity', format: 'number', decimals: 2 },
        { key: 'boardComplexity', label: 'Board complexity', format: 'number', decimals: 2 },
      ],
    },
  ],
}

export const COEFFICIENT_SETS: { key: 'chart' | 'board'; title: string }[] = [
  { key: 'board', title: 'Board coefficients' },
  { key: 'chart', title: 'Chart coefficients' },
]

export function readNumber(
  inputs: Record<string, unknown> | undefined,
  key: string,
): number | null {
  const raw = inputs?.[key]
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw
  if (typeof raw === 'string' && raw.trim() !== '') {
    const parsed = Number(raw)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

export function readString(
  inputs: Record<string, unknown> | undefined,
  key: string,
): string | null {
  const raw = inputs?.[key]
  if (typeof raw === 'string') return raw
  if (typeof raw === 'number') return String(raw)
  return null
}

export function readObject(
  inputs: Record<string, unknown> | undefined,
  key: string,
): Record<string, unknown> | null {
  const raw = inputs?.[key]
  return raw && typeof raw === 'object' && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : null
}

export function isStaleEstimate(
  estimate: ComplexityEstimateInfo | null | undefined,
  modelHash: string | null,
): boolean {
  if (!estimate || !modelHash) return false
  const hash = readString(estimate.inputs, 'modelHash')
  return !!hash && hash !== modelHash
}
