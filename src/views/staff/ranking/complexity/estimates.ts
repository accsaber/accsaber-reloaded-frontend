import type { ComplexityEstimateInfo, EstimateScenario } from '@/types/api/complexity'

export interface EstimateField {
  key: string
  label: string
  format: 'percent' | 'number' | 'count' | 'mix'
  decimals?: number
  always?: boolean
  reading?: boolean
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
      key: 'shares',
      title: 'Chart shares',
      fields: [
        { key: 'resetShare', label: 'Resets', format: 'percent' },
        { key: 'dotShare', label: 'Dots', format: 'percent' },
        { key: 'bottomUpShare', label: 'Bottom-row ups', format: 'percent', always: true },
        { key: 'crossoverShare', label: 'Crossovers', format: 'percent' },
        { key: 'topRowShare', label: 'Top row', format: 'percent' },
        { key: 'diagonalShare', label: 'Diagonals', format: 'percent' },
        { key: 'verticalStackShare', label: 'Vertical stacks', format: 'percent' },
        { key: 'outerShare', label: 'Outer notes', format: 'percent' },
      ],
    },
    {
      key: 'payFair',
      title: 'Pay-fair',
      fields: [
        { key: 'botEstimate', label: 'Bot Complexity Estimate', format: 'number', decimals: 1 },
        { key: 'scores', label: 'Scores', format: 'count' },
        { key: 'payPlays', label: 'Top plays used', format: 'count' },
        { key: 'payRatio', label: 'Top plays vs usual', format: 'percent', reading: true },
        { key: 'payFair', label: 'Pay-fair', format: 'number', decimals: 3, reading: true },
        { key: 'payWeight', label: 'Mix', format: 'mix' },
        { key: 'payAdjustment', label: 'Adjustment', format: 'number', decimals: 2, reading: true },
      ],
    },
  ],
}

export function mixLabel(payWeight: number): string {
  const share = Math.round(payWeight * 100)
  return share > 0 ? `Pay-fair ${share}%, Bot ${100 - share}%` : 'Bot 100%'
}

export function hasPayFairReading(inputs: Record<string, unknown> | undefined): boolean {
  return (readNumber(inputs, 'payRatio') ?? 0) > 0
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
