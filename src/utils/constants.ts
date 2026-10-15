import type { MetricType, TimeRange } from '@/types/display';

export const TIME_RANGE_PARAMS: Record<TimeRange, { amount: number; unit: 'h' | 'd' | 'mo' }> = {
  '24h': { amount: 24, unit: 'h' },
  '7d': { amount: 7, unit: 'd' },
  '14d': { amount: 14, unit: 'd' },
  '30d': { amount: 30, unit: 'd' },
  '90d': { amount: 90, unit: 'd' },
  '1y': { amount: 12, unit: 'mo' },
  'all': { amount: 240, unit: 'mo' },
}

export const HOUR_MS = 3_600_000
export const DAY_MS = 86_400_000

export const TIME_RANGE_MS: Record<TimeRange, number | null> = {
  '24h': 24 * HOUR_MS,
  '7d': 7 * DAY_MS,
  '14d': 14 * DAY_MS,
  '30d': 30 * DAY_MS,
  '90d': 90 * DAY_MS,
  '1y': 365 * DAY_MS,
  'all': null,
}

export function rangeWindowStart(range: TimeRange, dataMin: number, now: number): number {
  const ms = TIME_RANGE_MS[range]
  return ms === null ? dataMin : now - ms
}

export const DIFFICULTY_ORDER = ['EASY', 'NORMAL', 'HARD', 'EXPERT', 'EXPERT_PLUS'] as const

export const DIFF_COLOR: Record<string, string> = {
  EASY: 'var(--diff-easy)',
  NORMAL: 'var(--diff-normal)',
  HARD: 'var(--diff-hard)',
  EXPERT: 'var(--diff-expert)',
  EXPERT_PLUS: 'var(--diff-expert-plus)',
}

export const MAP_STATUS_ACCENT: Record<string, string> = {
  QUEUE: 'var(--accent-overall)',
  QUALIFIED: 'var(--accent-low-mid)',
  RANKED: 'var(--accent-standard-acc)',
}

import type { MapDifficultyStatus } from '@/types/enums'

export const QUEUE_STATUSES: MapDifficultyStatus[] = ['QUEUE', 'QUALIFIED']

import type { NewsType } from '@/types/enums'

export const NEWS_TYPE_LABELS: Record<NewsType, string> = {
  GENERAL: 'General',
  BATCH: 'Batch',
  CAMPAIGN: 'Campaign',
  MILESTONE_SET: 'Milestones',
  ITEMS: 'Items',
  PLUGIN: 'Plugin',
  CURVE: 'Curve',
}

export const NEWS_TYPE_ACCENT: Record<NewsType, string> = {
  GENERAL: 'var(--text-secondary)',
  BATCH: 'var(--accent-standard-acc)',
  CAMPAIGN: 'var(--accent-overall)',
  MILESTONE_SET: 'var(--tier-gold)',
  ITEMS: 'var(--tier-platinum)',
  PLUGIN: 'var(--tier-bronze)',
  CURVE: 'var(--accent-true-acc)',
}

export const NEWS_TYPE_ORDER: NewsType[] = [
  'GENERAL',
  'BATCH',
  'CAMPAIGN',
  'MILESTONE_SET',
  'ITEMS',
  'PLUGIN',
  'CURVE',
]

export const STANDALONE_NEWS_TYPES: NewsType[] = ['GENERAL', 'ITEMS', 'PLUGIN']

import type { EventState } from '@/types/api/events'

export const EVENT_STATE_LABELS: Record<EventState, string> = {
  live: 'Live',
  upcoming: 'Upcoming',
  past: 'Ended',
}

export const EVENT_STATE_ORDER: EventState[] = ['live', 'upcoming', 'past']

export const EVENT_STATE_ACCENT: Record<EventState, string> = {
  live: 'var(--success)',
  upcoming: 'var(--info)',
  past: 'var(--text-tertiary)',
}

export const CATEGORY_ORDER = ['true_acc', 'standard_acc', 'tech_acc', 'low_mid', 'overall'] as const

export const STANDARD_PIN_SLOTS = 4
export const SUPPORTER_PIN_SLOTS = 8

export const KOFI_URL = 'https://ko-fi.com/accsaberreloaded'

export const DISCORD_URL = 'https://discord.gg/DmzKSgcJWe'

export const CONTACT_EMAIL = 'tikugato@gmail.com'

export const CONTACT_MAILTO = `mailto:${CONTACT_EMAIL}`

export const LEGAL_UPDATED = '10 September 2026'


export const SCORE_DETAIL_METRICS: { key: MetricType; label: string }[] = [
  { key: 'accuracy' as MetricType, label: 'Accuracy' },
  { key: 'ap' as MetricType, label: 'AP' },
  { key: 'xpCumulative', label: 'XP (Cumulative)' },
  { key: 'xpPerAttempt', label: 'XP (Per Attempt)' },
]

export const MAP_STATS_METRICS: { key: MetricType; label: string }[] = [
  { key: 'ap', label: 'Max AP' },
  { key: 'avgAp', label: 'Avg AP' },
  { key: 'rankedPlays', label: 'Total Scores' },
]

export const TIER_COLORS: Record<string, string> = {
  BRONZE: 'var(--tier-bronze)',
  SILVER: 'var(--tier-silver)',
  GOLD: 'var(--tier-gold)',
  PLATINUM: 'var(--tier-platinum)',
  DIAMOND: 'var(--tier-diamond)',
  APEX: 'var(--tier-apex)',
}

export const TIER_ORDER: Record<string, number> = {
  BRONZE: 0, bronze: 0,
  SILVER: 1, silver: 1,
  GOLD: 2, gold: 2,
  PLATINUM: 3, platinum: 3,
  DIAMOND: 4, diamond: 4,
  APEX: 5, apex: 5,
}

export function tierColor(tier: string): string {
  return TIER_COLORS[tier.toUpperCase()] ?? 'var(--text-tertiary)'
}

export function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}
