import type { MissionBand, MissionPool, MissionType } from '@/types/api/missions'
import { formatDifficulty } from '@/utils/mappers'

export const BAND_LABEL: Record<MissionBand, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
  extreme: 'Extreme',
}

export const BAND_RANK: Record<MissionBand, number> = {
  extreme: 0,
  hard: 1,
  medium: 2,
  easy: 3,
}

export const POOL_ORDER: MissionPool[] = ['daily', 'weekly', 'event']

export const POOL_LABEL: Record<MissionPool, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  event: 'Event',
  community: 'Community',
}

const MISSION_UNIT: Partial<Record<MissionType, string>> = {
  PLAY_N_MAPS: 'maps',
  BATCH_PLAY_N: 'maps',
  XP_IN_WINDOW: 'XP',
  AP_GAIN_OVERALL: 'AP',
  PB_ABOVE_THRESHOLD: 'PBs',
  PB_RANKED_BEFORE_N: 'PBs',
  SCORES_N: 'PBs',
  STREAK_N_IN_CATEGORY: 'plays',
  STREAK_SUM_N: '115s',
  SNIPE_RIVAL_ANY_MAP: 'snipes',
  CAMPAIGN_COMPLETE_N: 'campaigns',
}

const INVARIANT_UNITS = new Set(['XP', 'AP', '115s'])

function unitFor(type: MissionType, value: number): string {
  const unit = MISSION_UNIT[type]
  if (!unit) return ''
  return value === 1 && !INVARIANT_UNITS.has(unit) ? unit.slice(0, -1) : unit
}

export function formatMissionValue(value: number): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 })
}

export function missionProgressLabel(type: MissionType, progress: number, target: number): string {
  const counts = `${formatMissionValue(progress)} / ${formatMissionValue(target)}`
  const unit = unitFor(type, target)
  return unit ? `${counts} ${unit}` : counts
}

export function missionUnitLabel(type: MissionType, value: number): string {
  const unit = unitFor(type, value)
  const amount = formatMissionValue(value)
  return unit ? `${amount} ${unit}` : amount
}

const DIFFICULTY_TOKENS = ['EXPERT_PLUS', 'EXPERT', 'HARD', 'NORMAL', 'EASY'] as const

export function normalizeDifficulties(text: string): string {
  let out = text
  for (const token of DIFFICULTY_TOKENS) {
    out = out.replace(new RegExp(`\\b${token}\\b`, 'g'), formatDifficulty(token))
  }
  return out
}

export function formatMissionCountdown(iso: string, nowMs: number = Date.now()): string {
  const ms = new Date(iso).getTime() - nowMs
  if (ms <= 0) return 'expired'
  const totalMin = Math.floor(ms / 60_000)
  const days = Math.floor(totalMin / 1440)
  const hours = Math.floor((totalMin % 1440) / 60)
  const minutes = totalMin % 60
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}
