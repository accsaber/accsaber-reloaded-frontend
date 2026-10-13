import type { MetricType, TimeRange } from '@/types/display'
import { TIME_RANGE_PARAMS } from '@/utils/constants'
import { ref, watch } from 'vue'

const METRICS_KEY = 'profile:stats:metrics'
const RANGE_KEY = 'profile:stats:range'

export const STATS_CHART_METRICS: {
  key: MetricType
  label: string
  colorVar: string
  invertY?: boolean
}[] = [
  { key: 'ap', label: 'AP', colorVar: '--tier-apex' },
  { key: 'avgAccuracy', label: 'Avg Accuracy', colorVar: '--success' },
  { key: 'rankedPlays', label: 'Ranked Plays', colorVar: '--info' },
  { key: 'rank', label: 'Rank', colorVar: '--tier-gold', invertY: true },
]

const METRIC_KEYS = STATS_CHART_METRICS.map((m) => m.key)
const RANGE_KEYS = Object.keys(TIME_RANGE_PARAMS) as TimeRange[]

function readStored<T>(key: string, parse: (raw: unknown) => T | null, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? fallback : parse(JSON.parse(raw)) ?? fallback
  } catch {
    return fallback
  }
}

function writeStored(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
  }
}

const selectedMetrics = ref<MetricType[]>(
  readStored<MetricType[]>(
    METRICS_KEY,
    (raw) => {
      if (!Array.isArray(raw)) return null
      const valid = raw.filter((m): m is MetricType => METRIC_KEYS.includes(m))
      return valid.length ? valid : null
    },
    ['ap'],
  ),
)

const selectedRange = ref<TimeRange>(
  readStored<TimeRange>(
    RANGE_KEY,
    (raw) => (typeof raw === 'string' && RANGE_KEYS.includes(raw as TimeRange) ? (raw as TimeRange) : null),
    '30d',
  ),
)

watch(selectedMetrics, (value) => writeStored(METRICS_KEY, value), { deep: true })
watch(selectedRange, (value) => writeStored(RANGE_KEY, value))

function toggleMetric(metric: MetricType): void {
  const active = new Set(selectedMetrics.value)
  if (active.has(metric)) {
    if (active.size === 1) return
    active.delete(metric)
  } else {
    active.add(metric)
  }
  selectedMetrics.value = METRIC_KEYS.filter((k) => active.has(k))
}

export function useStatsChartConfig() {
  return {
    availableMetrics: STATS_CHART_METRICS,
    rangeParams: TIME_RANGE_PARAMS,
    selectedMetrics,
    selectedRange,
    toggleMetric,
  }
}
