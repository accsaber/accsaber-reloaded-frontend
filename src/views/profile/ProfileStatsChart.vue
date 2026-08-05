<script setup lang="ts">
import ChartToggleGroup from '@/components/common/ChartToggleGroup.vue'
import TimeSeriesChart from '@/components/domain/TimeSeriesChart.vue'
import { useStatsChartConfig } from '@/composables/useStatsChartConfig'
import { useCategoryStore } from '@/stores/categories'
import { useThemeStore } from '@/stores/theme'
import type {
  RankingHistoryResponse,
  UserCategoryStatisticsResponse,
} from '@/types/api/users'
import type { CategoryCode, ChartSeries, ChartToggle, MetricType, TimeSeriesPoint } from '@/types/display'
import { rangeWindowStart } from '@/utils/constants'
import { dedupeRequest } from '@/utils/dedupe'
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  userId: string
  category: CategoryCode
}>()

const categoryStore = useCategoryStore()
const themeStore = useThemeStore()

const {
  availableMetrics,
  rangeParams,
  selectedMetrics,
  selectedRange,
  toggleMetric,
} = useStatsChartConfig()

const chartData = ref<UserCategoryStatisticsResponse[]>([])
const rankHistoryData = ref<RankingHistoryResponse[]>([])

const chartAccent = computed(() => categoryStore.getAccent(props.category))

function metricPercent(metric: MetricType): boolean {
  return metric === 'avgAccuracy'
}

function metricColor(metric: MetricType): string {
  void themeStore.theme
  const colorVar = availableMetrics.find((m) => m.key === metric)?.colorVar
  const resolved = colorVar
    ? getComputedStyle(document.documentElement).getPropertyValue(colorVar).trim()
    : ''
  return resolved || chartAccent.value
}

const metricToggles = computed<ChartToggle[]>(() =>
  availableMetrics.map((metric) => ({
    key: metric.key,
    label: metric.label,
    color: metricColor(metric.key),
  })),
)

function getMetricValue(metric: MetricType, stat: UserCategoryStatisticsResponse): number {
  switch (metric) {
    case 'ap': return stat.ap
    case 'avgAccuracy': return stat.averageAcc * 100
    case 'rankedPlays': return stat.rankedPlays
    case 'rank': return stat.ranking
    default: return 0
  }
}

function rawMetricPoints(metric: MetricType): TimeSeriesPoint[] {
  const source: TimeSeriesPoint[] = metric === 'rank'
    ? rankHistoryData.value.map((d) => ({ timestamp: new Date(d.recordedAt).getTime(), value: d.ranking }))
    : chartData.value.map((s) => ({ timestamp: new Date(s.createdAt).getTime(), value: getMetricValue(metric, s) }))
  return source.sort((a, b) => a.timestamp - b.timestamp)
}

function fillOntoTimeline(raw: TimeSeriesPoint[], timeline: number[]): TimeSeriesPoint[] {
  const out: TimeSeriesPoint[] = []
  let i = 0
  let last: number | null = null
  for (const ts of timeline) {
    while (i < raw.length && raw[i].timestamp <= ts) {
      last = raw[i].value
      i++
    }
    if (last !== null) out.push({ timestamp: ts, value: last })
  }
  return out
}

const chartSeries = computed<ChartSeries[]>(() => {
  const raws = selectedMetrics.value
    .map((metric) => ({ metric, raw: rawMetricPoints(metric) }))
    .filter((x) => x.raw.length > 0)
  if (raws.length === 0) return []

  const now = Date.now()
  const dataMin = Math.min(...raws.map((x) => x.raw[0].timestamp))
  const start = rangeWindowStart(selectedRange.value, dataMin, now)
  const span = Math.max(1, now - start)
  const bucketSize = Math.max(60000, Math.floor(span / 150))
  const startBucket = Math.floor(start / bucketSize)
  const endBucket = Math.floor(now / bucketSize)
  const timeline: number[] = []
  for (let b = startBucket; b < endBucket; b++) timeline.push(b * bucketSize)
  timeline.push(now)

  return raws.map(({ metric, raw }) => ({
    key: metric,
    label: availableMetrics.find((m) => m.key === metric)?.label ?? metric,
    points: fillOntoTimeline(raw, timeline),
    color: metricColor(metric),
    invertY: metric === 'rank',
    formatValue: metricPercent(metric) ? (v: number) => `${v.toFixed(2)}%` : undefined,
  }))
})

async function fetchChartData() {
  const range = selectedRange.value
  try {
    const { getUserHistoricStatistics } = await import('@/api/users')
    chartData.value = await dedupeRequest(`stats|${props.userId}|${props.category}|${range}`, () =>
      getUserHistoricStatistics(props.userId, {
        category: props.category,
        ...rangeParams[range],
      }),
    )
  } catch {
    chartData.value = []
  }
}

async function fetchRankHistory() {
  const range = selectedRange.value
  try {
    const { getUserRankingHistory } = await import('@/api/users')
    rankHistoryData.value = await dedupeRequest(`rank|${props.userId}|${props.category}|${range}`, () =>
      getUserRankingHistory(props.userId, {
        category: props.category,
        ...rangeParams[range],
      }),
    )
  } catch {
    rankHistoryData.value = []
  }
}

watch(
  [() => props.userId, () => props.category, selectedRange],
  () => { fetchChartData() },
  { immediate: true },
)

watch(
  [() => props.userId, () => props.category, selectedRange, () => selectedMetrics.value.includes('rank')],
  () => {
    if (selectedMetrics.value.includes('rank')) fetchRankHistory()
  },
  { immediate: true },
)

</script>

<template>
  <div class="stats-chart">
    <ChartToggleGroup :toggles="metricToggles" :active="selectedMetrics" label="Chart metrics"
      @select="toggleMetric($event as MetricType)" />
    <TimeSeriesChart :series="chartSeries" :selected-range="selectedRange"
      @update:selected-range="selectedRange = $event" />
  </div>
</template>

<style scoped>
.stats-chart {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  min-width: 0;
}

</style>
