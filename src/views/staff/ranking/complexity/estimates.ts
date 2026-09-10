import type {
  ComplexityDifficultyRow,
  ComplexityEstimateInfo,
  EstimateScenario,
} from '@/types/api/complexity'

export type EstimateFormat = 'percent' | 'number' | 'count' | 'text'

export interface EstimateField {
  key: string
  label: string
  format: EstimateFormat
  decimals?: number
}

export const ESTIMATE_FIELDS: Record<EstimateScenario, EstimateField[]> = {
  OLD_SCRIPT: [
    { key: 'aiAccuracy', label: 'BeatLeader accuracy', format: 'percent' },
    { key: 'shiftedAccuracy', label: 'Shifted accuracy', format: 'percent' },
    { key: 'apTarget', label: 'AP target', format: 'number', decimals: 0 },
    { key: 'rawMultiplier', label: 'Raw multiplier', format: 'number', decimals: 3 },
    { key: 'transformedMultiplier', label: 'Transformed multiplier', format: 'number', decimals: 3 },
  ],
  NEW_SCRIPT: [
    { key: 'meanNoteAccuracy', label: 'Mean note accuracy', format: 'percent' },
    { key: 'worstNoteAccuracy', label: 'Worst note accuracy', format: 'percent' },
    { key: 'meanTerm', label: 'Mean term', format: 'number', decimals: 4 },
    { key: 'worstTerm', label: 'Worst term', format: 'number', decimals: 4 },
    { key: 'intercept', label: 'Intercept', format: 'number', decimals: 3 },
    { key: 'meanSlope', label: 'Mean slope', format: 'number', decimals: 3 },
    { key: 'worstSlope', label: 'Worst slope', format: 'number', decimals: 3 },
    { key: 'notes', label: 'Notes', format: 'count' },
    { key: 'predictedNotes', label: 'Predicted notes', format: 'count' },
    { key: 'model', label: 'Model', format: 'text' },
    { key: 'mapVersion', label: 'Map version', format: 'text' },
  ],
}

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

export function worstShareLabel(inputs: Record<string, unknown> | undefined): string | null {
  const share = readNumber(inputs, 'worstShare')
  if (share == null || share <= 0) return null
  return `${(share * 100).toFixed(share * 100 < 1 ? 1 : 0)}%`
}

export interface EstimateHealth {
  missing: number
  stale: number
  total: number
  modelHash: string | null
  updatedAt: string | null
}

export function estimateHealth(
  rows: ComplexityDifficultyRow[],
  scenario: EstimateScenario,
): EstimateHealth {
  let newest: ComplexityEstimateInfo | null = null
  for (const row of rows) {
    const estimate = row.estimates[scenario]
    if (!estimate) continue
    if (!newest || estimate.updatedAt > newest.updatedAt) newest = estimate
  }
  const modelHash = readString(newest?.inputs, 'modelHash')
  let missing = 0
  let stale = 0
  for (const row of rows) {
    const estimate = row.estimates[scenario]
    if (!estimate) {
      missing += 1
      continue
    }
    const hash = readString(estimate.inputs, 'modelHash')
    if (modelHash && hash && hash !== modelHash) stale += 1
  }
  return {
    missing,
    stale,
    total: rows.length,
    modelHash,
    updatedAt: newest?.updatedAt ?? null,
  }
}

export function isStaleEstimate(
  estimate: ComplexityEstimateInfo | null | undefined,
  modelHash: string | null,
): boolean {
  if (!estimate || !modelHash) return false
  const hash = readString(estimate.inputs, 'modelHash')
  return !!hash && hash !== modelHash
}
