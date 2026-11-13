import type { MissionTier, TimeSeriesPointResponse } from '@/types/api/statistics'
import type { TableColumn, TimeSeriesPoint } from '@/types/display'
import { formatAccuracy, formatCount, formatFixed, formatRelativeDate, formatShortDate } from '@/utils/formatters'

export const STATS_PAGE_SIZE = 25

export const NO_VALUE = '–'

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

function decimal(value: unknown, digits: number): string {
  if (value === null || value === undefined) return NO_VALUE
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: digits })
}

export function toChartPoints(data: TimeSeriesPointResponse[]): TimeSeriesPoint[] {
  return data.map((d) => ({ timestamp: new Date(d.date).getTime(), value: d.value }))
}

function rateClass(rate: number | null | undefined): string {
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

export const fmt = {
  count: (value: unknown) => formatCount(value as number | null),
  decimal: (value: unknown) => decimal(value, 1),
  whole: (value: unknown) => decimal(value, 0),
  fixed2: (value: unknown) => formatFixed(value as number | null, 2),
  rate: (value: unknown) => formatAccuracy(value as number | null, 1),
  accuracy: (value: unknown) => formatAccuracy(value as number | null),
  percentPoint: (value: unknown) => (value == null ? NO_VALUE : `${Number(value).toFixed(1)}%`),
  essence: (value: unknown) => `✦ ${formatCount(value as number | null)}`,
  relative: (value: unknown) => (value ? formatRelativeDate(value as string) : NO_VALUE),
  date: (value: unknown) => formatShortDate(value as string | null, NO_VALUE),
}

const strongClass = () => 'stats-strong'
const dimClass = () => 'stats-dim'

export const rankCol: TableColumn = { key: 'rank', label: '#', align: 'right', mono: true, width: '64px' }
export const playerCol: TableColumn = { key: 'player', label: 'Player', align: 'left' }

export function numCol(
  key: string,
  label: string,
  width: number,
  format: TableColumn['format'] = fmt.count,
): TableColumn {
  return { key, label, align: 'right', mono: true, width: `${width}px`, format }
}

export function mainCol(
  key: string,
  label: string,
  width: number,
  format: TableColumn['format'] = fmt.count,
): TableColumn {
  return { ...numCol(key, label, width, format), primary: true, cellClass: strongClass }
}

export function rateCol(key: string, label: string, width: number): TableColumn {
  return { ...numCol(key, label, width, fmt.rate), cellClass: (value) => rateClass(value as number | null) }
}

export function dateCol(key: string, label: string, format: TableColumn['format'] = fmt.relative): TableColumn {
  return { key, label, align: 'right', width: '120px', format, cellClass: dimClass }
}
