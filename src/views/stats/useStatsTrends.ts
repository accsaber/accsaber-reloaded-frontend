import { useQueryParams } from '@/composables/useQueryParams'
import type { TimeSeriesPointResponse } from '@/types/api/statistics'
import type { MetricType, TimeRange, TimeSeriesPoint } from '@/types/display'
import { TIME_RANGE_PARAMS } from '@/utils/constants'
import { computed, ref, shallowRef, watch } from 'vue'
import { toChartPoints } from './statsFormat'
import type { StatsApi } from './useStatsBoard'

export function useStatsTrends<E = undefined>(options: {
  metrics: { key: MetricType; label: string }[]
  active: () => boolean
  filters: () => unknown
  load: (
    api: StatsApi,
    range: (typeof TIME_RANGE_PARAMS)[TimeRange],
    metric: MetricType,
  ) => Promise<{ points: TimeSeriesPointResponse[]; extra?: E }>
}) {
  const { queryRef } = useQueryParams()
  const rangeParam = queryRef<TimeRange>('range')
  const metricParam = queryRef<MetricType>('metric')

  const range = computed<TimeRange>(() => (rangeParam.value in TIME_RANGE_PARAMS ? rangeParam.value as TimeRange : '30d'))
  const metric = computed(() => options.metrics.find((m) => m.key === metricParam.value) ?? options.metrics[0]!)

  const loading = ref(false)
  const points = ref<TimeSeriesPoint[]>([])
  const extra = shallowRef<E>()

  let requestId = 0

  async function fetchTrends() {
    const id = ++requestId
    loading.value = true
    try {
      const api = await import('@/api/statistics')
      const result = await options.load(api, TIME_RANGE_PARAMS[range.value], metric.value.key)
      if (id !== requestId) return
      points.value = toChartPoints(result.points)
      extra.value = result.extra
    } catch {
      if (id !== requestId) return
      points.value = []
      extra.value = undefined
    }
    loading.value = false
  }

  watch(
    () => (options.active() ? JSON.stringify([options.filters(), range.value, metric.value.key]) : null),
    (key) => { if (key) fetchTrends() },
    { immediate: true },
  )

  return {
    metrics: options.metrics,
    range,
    metric,
    loading,
    points,
    extra,
    setRange: (value: TimeRange) => { rangeParam.value = value },
    setMetric: (value: MetricType) => { metricParam.value = value },
  }
}
