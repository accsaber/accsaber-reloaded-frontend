import type { MissionTier } from '@/types/api/statistics'

export const NO_VALUE = '-'

export const MISSION_TIER_ORDER: MissionTier[] = [
  'new', 'casual', 'moderate', 'strong', 'top', 'elite', 'unknown',
]

export const MISSION_TIER_LABELS: Record<MissionTier, string> = {
  new: 'New',
  casual: 'Casual',
  moderate: 'Moderate',
  strong: 'Strong',
  top: 'Top',
  elite: 'Elite',
  unknown: 'Unknown',
}

export const MISSION_TIER_HINTS: Record<MissionTier, string> = {
  new: 'Skill under 400',
  casual: 'Skill 400 to 600',
  moderate: 'Skill 600 to 750',
  strong: 'Skill 750 to 950',
  top: 'Skill 950 to 1100',
  elite: 'Skill 1100 and up',
  unknown: 'Assigned before skill was recorded',
}

export function fmtInt(value: unknown): string {
  if (value === null || value === undefined) return NO_VALUE
  return Number(value).toLocaleString()
}

export function fmtDecimal(value: unknown, digits = 1): string {
  if (value === null || value === undefined) return NO_VALUE
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: digits })
}

/** Backend rate fields are fractions of 1. */
export function fmtFraction(value: unknown, digits = 1): string {
  if (value === null || value === undefined) return NO_VALUE
  return `${(Number(value) * 100).toFixed(digits)}%`
}

/** The completion-rate chart already arrives as a whole percentage. */
export function fmtPercentPoint(value: number): string {
  return `${value.toFixed(1)}%`
}

export function rateClass(rate: number | null | undefined): string {
  if (rate === null || rate === undefined) return 'rate--none'
  if (rate < 0.15) return 'rate--critical'
  if (rate < 0.35) return 'rate--low'
  if (rate < 0.6) return 'rate--mid'
  if (rate < 0.85) return 'rate--high'
  return 'rate--top'
}

export function plural(count: number, noun: string): string {
  return `${count.toLocaleString()} ${noun}${count === 1 ? '' : 's'}`
}

export function labelCase(value: unknown): string {
  const raw = String(value ?? '')
  if (!raw) return NO_VALUE
  return raw.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
}
