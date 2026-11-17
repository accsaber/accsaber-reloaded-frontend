<script setup lang="ts">
import DataTable from '@/components/common/DataTable.vue'
import PaginationControls from '@/components/common/PaginationControls.vue'
import type { ComparisonScenario, ComplexityDifficultyRow } from '@/types/api/complexity'
import type { TableColumn } from '@/types/display'
import { AP_DECIMALS, CX_DECIMALS, isBigMove } from '@/utils/complexity'
import { formatCount } from '@/utils/formatters'
import ComplexityPin from './ComplexityPin.vue'
import MapIdentityCell from './MapIdentityCell.vue'
import ScenarioCell from './ScenarioCell.vue'
import SortBasisTabs from './SortBasisTabs.vue'
import {
  MAP_ASCENDING_KEYS,
  MAP_DELTA_KEYS,
  MAP_SORT_KEY,
  cxKey,
  mapSortRequest,
  type ScenarioSortRequest,
} from './scenarioKeys'
import { useSortBasis, useSortState } from './useScenarioSort'
import { computed, watch } from 'vue'

const props = withDefaults(defineProps<{
  rows: ComplexityDifficultyRow[]
  scenario: ComparisonScenario
  page: number
  totalPages: number
  loading?: boolean
  emptyMessage?: string
}>(), {
  loading: false,
  emptyMessage: 'No difficulties match these filters',
})

const emit = defineEmits<{
  select: [row: ComplexityDifficultyRow]
  'update:page': [page: number]
  'update:sort': [request: ScenarioSortRequest]
}>()

const PAGE_ROWS = 50
const METRICS = [
  { name: 'complexity', field: 'complexity', label: 'Complexity', decimals: CX_DECIMALS, width: '200px' },
  { name: 'topAp', field: 'topAp', label: 'Top AP', decimals: AP_DECIMALS, width: '220px' },
  { name: 'avgWeighted', field: 'averageWeightedAp', label: 'Avg Weighted', decimals: AP_DECIMALS, width: '200px' },
] as const

const sort = useSortState({ deltaKeys: MAP_DELTA_KEYS, defaultKey: MAP_SORT_KEY, ascendingKeys: MAP_ASCENDING_KEYS })
const { sortKey, sortDirection, sortState, absolute, onSort } = sort

const { basis, keyOf, setBasis, label } = useSortBasis(
  () => ({
    complexity: { change: 'cxDelta', now: 'cxCurrent', after: cxKey(props.scenario) },
    topAp: { change: 'topApDelta', now: 'topApCurrent', after: 'topAp' },
    avgWeighted: { change: 'avgWeightedDelta', now: 'avgWeightedCurrent', after: 'avgWeighted' },
  }),
  sort,
)

watch([sortKey, sortDirection, absolute], () => {
  emit('update:sort', mapSortRequest(sortKey.value, sortDirection.value, absolute.value))
}, { immediate: true })

const columns = computed<TableColumn[]>(() => [
  { key: 'song', label: 'Map', sortable: true, primary: true },
  ...METRICS.map((metric) => ({
    key: keyOf(metric.name),
    label: label(metric.name, metric.label),
    sortable: true,
    align: 'right' as const,
    width: metric.width,
  })),
  { key: 'scores', label: 'Scores', sortable: true, align: 'right', mono: true, width: '100px', format: (v) => formatCount(v as number) },
])

const tableRows = computed<Record<string, unknown>[]>(() =>
  props.rows.map((row) => ({
    id: row.map.id,
    source: row,
    scores: row.scores,
    moved: !row.complexityPinned && isBigMove(row.deltas[props.scenario]?.complexity),
  })),
)

function sourceOf(row: Record<string, unknown>): ComplexityDifficultyRow {
  return row.source as ComplexityDifficultyRow
}

function rowClass(row: Record<string, unknown>) {
  return row.moved ? 'complexity-maps__row--moved' : ''
}
</script>

<template>
  <div class="complexity-maps">
    <div class="complexity-maps__bar">
      <slot name="filters" />
      <SortBasisTabs :basis="basis" @change="setBasis" />
    </div>

    <DataTable
      :columns="columns"
      :rows="tableRows"
      :sort-state="sortState"
      :loading="loading && !rows.length"
      :refreshing="loading && rows.length > 0"
      :loading-rows="PAGE_ROWS"
      :row-height="64"
      row-key="id"
      row-clickable
      :row-class="rowClass"
      :empty-message="emptyMessage"
      @sort="onSort"
      @row-click="(row) => emit('select', sourceOf(row))"
    >
      <template #cell-song="{ row }">
        <MapIdentityCell :row="sourceOf(row)" />
      </template>

      <template v-for="metric in METRICS" :key="metric.name" #[`cell-${keyOf(metric.name)}`]="{ row }">
        <span class="complexity-maps__metric">
          <ComplexityPin v-if="metric.name === 'complexity' && sourceOf(row).complexityPinned" />
          <ScenarioCell
            :entry="sourceOf(row)" :field="metric.field" :scenario="scenario"
            :decimals="metric.decimals"
            :big-threshold="metric.name === 'complexity'"
            emphasis
          />
        </span>
      </template>

      <template #mobile-card="{ row }">
        <button type="button" class="complexity-maps__card" @click="emit('select', sourceOf(row))">
          <MapIdentityCell :row="sourceOf(row)" />
          <span class="complexity-maps__card-values">
            <span v-for="metric in METRICS" :key="metric.name" class="complexity-maps__card-value">
              <span class="field-label">{{ metric.label }}</span>
              <ScenarioCell
                :entry="sourceOf(row)" :field="metric.field" :scenario="scenario"
                :decimals="metric.decimals"
                emphasis
              />
            </span>
          </span>
        </button>
      </template>
    </DataTable>

    <div class="complexity-maps__pages">
      <PaginationControls v-if="totalPages > 1" :page="page" :total-pages="totalPages" @update:page="emit('update:page', $event)" />
    </div>
  </div>
</template>

<style scoped>
.complexity-maps {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  min-width: 0;
}

.complexity-maps__bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-sm);
}


.complexity-maps__metric {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
}

.complexity-maps :deep(.complexity-maps__row--moved) {
  background: color-mix(in srgb, var(--warning) 8%, var(--bg-surface));
}

.complexity-maps__pages {
  min-height: var(--control-h);
}

.complexity-maps__card {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  width: 100%;
  padding: var(--space-md);
  font: inherit;
  color: inherit;
  text-align: left;
  background: none;
  border: none;
  cursor: pointer;
}

.complexity-maps__card-values {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-sm);
}

.complexity-maps__card-value {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
}
</style>
