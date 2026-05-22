import type { MissionBand, MissionPool } from '@/types/api/missions'
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
