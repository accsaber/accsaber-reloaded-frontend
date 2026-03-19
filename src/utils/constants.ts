import type { MetricType, TimeRange } from '@/types/display'

export const TIME_RANGE_PARAMS: Record<TimeRange, { amount: number; unit: 'h' | 'd' | 'w' | 'mo' }> = {
  '24h': { amount: 24, unit: 'h' },
  '7d': { amount: 7, unit: 'd' },
  '14d': { amount: 14, unit: 'd' },
  '30d': { amount: 30, unit: 'd' },
  '90d': { amount: 90, unit: 'd' },
  '1y': { amount: 12, unit: 'mo' },
  'all': { amount: 120, unit: 'mo' },
}

export const DIFFICULTY_ORDER = ['EASY', 'NORMAL', 'HARD', 'EXPERT', 'EXPERT_PLUS'] as const

export const ROLE_ORDER: Record<string, number> = {
  ADMIN: 0,
  DEVELOPER: 1,
  MODERATOR: 2,
  HEAD_RANKING: 3,
  RANKING: 4,
}

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin',
  DEVELOPER: 'Developer',
  MODERATOR: 'Moderator',
  HEAD_RANKING: 'Head Ranking',
  RANKING: 'Ranking',
}

export const SCORE_DETAIL_METRICS: { key: MetricType; label: string }[] = [
  { key: 'accuracy' as MetricType, label: 'Accuracy' },
  { key: 'ap' as MetricType, label: 'AP' },
]

export const MAP_STATS_METRICS: { key: MetricType; label: string }[] = [
  { key: 'ap', label: 'Max AP' },
  { key: 'avgAccuracy', label: 'Avg AP' },
  { key: 'rankedPlays', label: 'Total Scores' },
]
