<script setup lang="ts">
import BaseTabs from '@/components/common/BaseTabs.vue'
import ChartToggleGroup from '@/components/common/ChartToggleGroup.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import { chartAnimationDuration, readChartTheme, useLineChart } from '@/composables/useLineChart'
import { useThemeStore } from '@/stores/theme'
import type { ChartSeries, ChartToggle, MetricType, TimeRange, TimeSeriesPoint } from '@/types/display'
import { DAY_MS, HOUR_MS, rangeWindowStart } from '@/utils/constants'
import type { ChartConfiguration } from 'chart.js'
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  data?: TimeSeriesPoint[]
  metricLabel?: string
  accentColor?: string
  series?: ChartSeries[]
  availableMetrics?: { key: MetricType; label: string }[]
  selectedMetric?: MetricType
  selectedRange?: TimeRange
  invertY?: boolean
  formatValue?: (v: number) => string
  yMax?: number
  yMin?: number
  fitToData?: boolean
}>()

interface ResolvedSeries {
  label: string
  points: TimeSeriesPoint[]
  color: string
  invertY: boolean
  formatValue?: (v: number) => string
}

const resolvedSeries = computed<ResolvedSeries[]>(() =>
  props.series?.length
    ? props.series.map((s) => ({
      label: s.label,
      points: s.points,
      color: s.color,
      invertY: !!s.invertY,
      formatValue: s.formatValue,
    }))
    : [{
      label: props.metricLabel ?? '',
      points: props.data ?? [],
      color: props.accentColor ?? '',
      invertY: !!props.invertY,
      formatValue: props.formatValue,
    }],
)

const emit = defineEmits<{
  'update:selectedMetric': [value: MetricType]
  'update:selectedRange': [value: TimeRange]
}>()

const themeStore = useThemeStore()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const { render } = useLineChart(canvasRef)
const isLoading = ref(true)

const timeRanges: ChartToggle[] = [
  { key: '24h', label: '24h' },
  { key: '7d', label: '7d' },
  { key: '14d', label: '2w' },
  { key: '30d', label: '30d' },
  { key: '90d', label: '90d' },
  { key: '1y', label: '1y' },
  { key: 'all', label: 'All' },
]

const activeRange = computed(() => props.selectedRange ?? '30d')

const hasData = computed(() => resolvedSeries.value.some((s) => s.points.length > 0))

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return `${value}`
  return Number.isInteger(value) ? `${value}` : value.toFixed(2)
}

function clampToWindow(points: TimeSeriesPoint[], min: number): TimeSeriesPoint[] {
  const inside: TimeSeriesPoint[] = []
  let carried: TimeSeriesPoint | null = null
  for (const p of points) {
    if (p.timestamp >= min) inside.push(p)
    else if (!carried || p.timestamp > carried.timestamp) carried = p
  }
  return carried ? [{ ...carried, timestamp: min }, ...inside] : inside
}

function dataExtent(series: { points: TimeSeriesPoint[] }[]) {
  let min = Number.POSITIVE_INFINITY
  let max = Number.NEGATIVE_INFINITY
  for (const s of series) {
    for (const p of s.points) {
      if (p.timestamp < min) min = p.timestamp
      if (p.timestamp > max) max = p.timestamp
    }
  }
  return Number.isFinite(min) ? { min, max } : null
}

function timeDomain(series: { points: TimeSeriesPoint[] }[], windowMin: number, now: number) {
  const extent = dataExtent(series)

  if (props.fitToData && extent) {
    const span = extent.max - extent.min
    const pad = span > 0 ? span * 0.05 : HOUR_MS / 2
    return { min: extent.min - pad, max: extent.max + pad }
  }

  const max = Math.max(now, extent?.max ?? now)
  return max - windowMin < HOUR_MS ? { min: max - HOUR_MS, max } : { min: windowMin, max }
}

function buildChart(): ChartConfiguration<'line'> {
  const theme = readChartTheme()

  const series = resolvedSeries.value
  const isMulti = series.length > 1
  const now = Date.now()
  const windowMin = rangeWindowStart(activeRange.value, dataExtent(series)?.min ?? now, now)

  const prepared = series.map((s, idx) => {
    const points = clampToWindow(s.points, windowMin)
    const pointMap = new Map<number, TimeSeriesPoint>()
    for (const p of points) pointMap.set(p.timestamp, p)
    return {
      ...s,
      idx,
      points,
      pointMap,
      color: s.color || theme.accent,
      axisId: isMulti ? `y${idx}` : 'y',
    }
  })

  const domain = timeDomain(prepared, windowMin, now)
  const spanMs = domain.max - domain.min

  const formatTick = (ts: number): string => {
    const d = new Date(ts)
    if (spanMs <= 36 * HOUR_MS) {
      return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    }
    if (spanMs <= 5 * DAY_MS) {
      return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric' })
    }
    if (spanMs <= 14 * DAY_MS) {
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    }
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' })
  }

  const formatTooltipTitle = (ts: number): string => {
    const d = new Date(ts)
    const date = d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
    if (spanMs > 14 * DAY_MS) return date
    return `${date}, ${d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`
  }

  const yScales = Object.fromEntries(prepared.map((s) => [s.axisId, {
    reverse: s.invertY,
    position: !isMulti || s.idx === 0 ? 'left' : 'right',
    display: !isMulti || s.idx < 2,
    max: isMulti ? undefined : props.yMax,
    min: isMulti ? undefined : props.yMin,
    grid: { color: theme.grid, drawOnChartArea: s.idx === 0 },
    ticks: {
      color: isMulti ? s.color : theme.text,
      font: theme.font,
      callback: (value: number | string) =>
        s.formatValue ? s.formatValue(value as number) : formatNumber(value as number),
    },
  }]))

  return {
    type: 'line',
    data: {
      datasets: prepared.map((s) => ({
        label: s.label,
        data: s.points.map((p) => ({ x: p.timestamp, y: p.value })),
        borderColor: s.color,
        backgroundColor: `color-mix(in srgb, ${s.color} 10%, transparent)`,
        fill: isMulti ? false : s.invertY ? 'start' : true,
        yAxisID: s.axisId,
        spanGaps: true,
        tension: 0.3,
        pointRadius: s.points.length < 50 ? 3 : 0,
        pointHoverRadius: 5,
        borderWidth: 2,
      })),
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: chartAnimationDuration() },
      interaction: {
        mode: 'index',
        axis: 'x',
        intersect: false,
      },
      plugins: {
        tooltip: {
          callbacks: {
            title: (items) => {
              const ts = items[0]?.parsed?.x
              return ts != null ? formatTooltipTitle(ts) : ''
            },
            label: (item) => {
              const s = prepared[item.datasetIndex]
              const point = item.parsed.x != null ? s?.pointMap.get(item.parsed.x) : undefined
              if (point?.tooltipLines?.length) {
                return point.tooltipLines
              }
              const y = item.parsed.y ?? 0
              const val = s?.formatValue ? s.formatValue(y) : formatNumber(y)
              return isMulti ? `${s?.label}: ${val}` : val
            },
            afterLabel: () => '',
          },
        },
      },
      scales: {
        x: {
          type: 'linear',
          min: domain.min,
          max: domain.max,
          grid: { color: theme.grid },
          ticks: {
            color: theme.text,
            font: theme.font,
            maxTicksLimit: 8,
            maxRotation: 0,
            autoSkip: true,
            callback: (value: number | string) => formatTick(value as number),
          },
        },
        ...yScales,
      },
    },
  }
}

async function loadChart() {
  isLoading.value = true
  try {
    await render(buildChart)
  } catch {
  }
  isLoading.value = false
}

watch([
  () => props.data,
  () => props.series,
  () => props.accentColor,
  () => props.selectedRange,
  () => themeStore.theme,
], () => {
  loadChart()
}, { immediate: true })
</script>

<template>
  <div class="chart-container">
    <div v-if="availableMetrics?.length" class="chart-container__controls">
      <BaseTabs v-if="availableMetrics && selectedMetric"
        :tabs="availableMetrics.map((m) => ({ key: m.key, label: m.label }))" :model-value="selectedMetric"
        @update:model-value="emit('update:selectedMetric', $event as MetricType)" />
    </div>
    <ChartToggleGroup :toggles="timeRanges" :active="[activeRange]" label="Time range"
      @select="emit('update:selectedRange', $event as TimeRange)" />
    <div class="chart-container__canvas-wrap">
      <SkeletonLoader v-if="isLoading" variant="card" height="240px" />
      <div v-else-if="!hasData" class="chart-container__empty">
        No scores could be found with the timeframe selected.
      </div>
      <canvas v-show="!isLoading && hasData" ref="canvasRef" />
    </div>
  </div>
</template>

<style scoped>
.chart-container {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.chart-container__controls {
  display: flex;
  gap: var(--space-sm);
}

.chart-container__canvas-wrap {
  position: relative;
  height: 240px;
}

.chart-container__canvas-wrap canvas {
  width: 100% !important;
  height: 100% !important;
}

.chart-container__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-secondary);
  font-size: var(--text-body);
}
</style>
