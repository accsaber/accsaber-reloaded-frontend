<script setup lang="ts">
import ChartToggleGroup from '@/components/common/ChartToggleGroup.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import { chartAnimationDuration, readChartTheme, useLineChart } from '@/composables/useLineChart'
import { useCategoryStore } from '@/stores/categories'
import type { ChartToggle } from '@/types/display'
import type { ChartConfiguration } from 'chart.js'
import { computed, ref, watch } from 'vue'

const props = defineProps<{ userId: string }>()

const CURVE_LENGTHS = [20, 50, 100]

const categoryStore = useCategoryStore()

interface Curve {
  code: string
  name: string
  ap: number[]
}

const canvasRef = ref<HTMLCanvasElement | null>(null)
const { render, destroy } = useLineChart(canvasRef)

const loading = ref(true)
const curves = ref<Curve[]>([])
const hiddenCodes = ref<string[]>([])
const requestedLength = ref(CURVE_LENGTHS[CURVE_LENGTHS.length - 1])

const longestCurve = computed(() =>
  curves.value.reduce((max, curve) => Math.max(max, curve.ap.length), 0),
)

const lengthToggles = computed<ChartToggle[]>(() =>
  CURVE_LENGTHS
    .filter((_, i) => i === 0 || CURVE_LENGTHS[i - 1] < longestCurve.value)
    .map((n) => ({ key: String(n), label: `Top ${n}` })),
)

const activeLength = computed(() =>
  Math.min(requestedLength.value, Number(lengthToggles.value[lengthToggles.value.length - 1].key)),
)

const categoryToggles = computed<ChartToggle[]>(() =>
  curves.value.map((curve) => ({
    key: curve.code,
    label: curve.name,
    color: categoryStore.getAccent(curve.code),
  })),
)

const visibleCodes = computed(() =>
  curves.value.map((c) => c.code).filter((code) => !hiddenCodes.value.includes(code)),
)

const plotted = computed(() =>
  curves.value
    .filter((curve) => visibleCodes.value.includes(curve.code))
    .map((curve) => ({
      name: curve.name,
      color: categoryStore.getAccent(curve.code),
      ap: curve.ap.slice(0, activeLength.value),
    })),
)

const hasData = computed(() => plotted.value.length > 0)

function toggleCurve(code: string) {
  hiddenCodes.value = hiddenCodes.value.includes(code)
    ? hiddenCodes.value.filter((c) => c !== code)
    : [...hiddenCodes.value, code]
}

async function fetchCurves() {
  const userId = props.userId
  loading.value = true
  try {
    const [, res] = await Promise.all([
      categoryStore.fetchCategories(),
      import('@/api/users').then((m) => m.getUserApCurves(userId)),
    ])
    if (userId !== props.userId) return
    const byId = new Map(res.map((curve) => [curve.categoryId, curve.ap]))
    curves.value = categoryStore.categories
      .map((cat) => ({ code: cat.code, name: cat.name, ap: byId.get(cat.id) ?? [] }))
      .filter((curve) => curve.ap.length > 0)
  } catch {
    if (userId !== props.userId) return
    curves.value = []
  }
  loading.value = false
}

function buildChart(): ChartConfiguration<'line'> {
  const series = plotted.value
  const theme = readChartTheme()

  return {
    type: 'line',
    data: {
      datasets: series.map((curve) => ({
        label: curve.name,
        data: curve.ap.map((ap, i) => ({ x: i + 1, y: ap })),
        borderColor: curve.color,
        pointBackgroundColor: 'transparent',
        pointBorderColor: curve.color,
        pointRadius: curve.ap.length > 60 ? 2 : 3,
        pointHoverRadius: 5,
        borderWidth: 2,
        tension: 0.1,
      })),
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: chartAnimationDuration() },
      interaction: { mode: 'nearest' as const, intersect: false },
      plugins: {
        tooltip: {
          callbacks: {
            title: (items) => {
              const item = items[0]
              return item ? `${series[item.datasetIndex].name} - #${item.parsed.x}` : ''
            },
            label: (item) => `${(item.parsed.y ?? 0).toFixed(2)} AP`,
          },
        },
      },
      scales: {
        x: {
          type: 'linear' as const,
          min: 1,
          title: { display: true, text: 'Nth Score', color: theme.text, font: theme.font },
          grid: { color: theme.grid },
          ticks: {
            color: theme.text,
            font: theme.font,
            maxTicksLimit: 10,
            maxRotation: 0,
            precision: 0,
          },
        },
        y: {
          title: { display: true, text: 'Raw AP', color: theme.text, font: theme.font },
          grid: { color: theme.grid },
          ticks: {
            color: theme.text,
            font: theme.font,
            callback: (value: number | string) => Math.round(Number(value)),
          },
        },
      },
    },
  }
}

watch(() => props.userId, () => { fetchCurves() }, { immediate: true })

watch(plotted, () => {
  if (hasData.value) render(buildChart)
  else destroy()
})
</script>

<template>
  <div class="ap-curve">
    <div class="ap-curve__controls">
      <ChartToggleGroup :toggles="categoryToggles" :active="visibleCodes" label="Categories" @select="toggleCurve" />
      <ChartToggleGroup v-if="lengthToggles.length > 1" :toggles="lengthToggles" :active="[String(activeLength)]"
        label="Curve length" @select="requestedLength = Number($event)" />
    </div>

    <div class="ap-curve__canvas-wrap">
      <SkeletonLoader v-if="loading" variant="card" height="320px" />
      <div v-else-if="!hasData" class="ap-curve__empty">
        No ranked scores to plot.
      </div>
      <canvas ref="canvasRef" :class="{ 'ap-curve__canvas--hidden': loading || !hasData }" />
    </div>
  </div>
</template>

<style scoped>
.ap-curve {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  width: 100%;
}

.ap-curve__controls {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: var(--space-sm);
}

.ap-curve__canvas-wrap {
  position: relative;
  height: 320px;
}

.ap-curve__canvas-wrap canvas {
  width: 100% !important;
  height: 100% !important;
}

.ap-curve__canvas-wrap .ap-curve__canvas--hidden {
  display: none !important;
}

.ap-curve__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-secondary);
  font-size: var(--text-body);
}
</style>
