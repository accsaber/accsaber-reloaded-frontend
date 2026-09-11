<script setup lang="ts">
import DataTable from '@/components/common/DataTable.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import PaginationControls from '@/components/common/PaginationControls.vue'
import type {
  ComparisonScenario,
  ComplexityDifficultyRow,
  ComplexityScenario,
} from '@/types/api/complexity'
import type { TableColumn } from '@/types/display'
import {
  AP_DECIMALS,
  CX_DECIMALS,
  PIN_HINT,
  SCENARIO_ORDER,
  SCENARIO_SHORT,
  isBigMove,
} from '@/utils/complexity'
import { formatCount } from '@/utils/formatters'
import ComplexityPin from './ComplexityPin.vue'
import MapIdentityCell from './MapIdentityCell.vue'
import ScenarioCell from './ScenarioCell.vue'
import {
  MAP_ASCENDING_KEYS,
  MAP_DELTA_KEYS,
  MAP_SORT_KEY,
  cxKey,
  mapSortRequest,
  type ScenarioSortRequest,
} from './scenarioKeys'
import { useSortState } from './useScenarioSort'
import { computed, watch } from 'vue'

const props = withDefaults(defineProps<{
  rows: ComplexityDifficultyRow[]
  scenario: ComparisonScenario
  page: number
  totalPages: number
  columns?: readonly ComplexityScenario[]
  loading?: boolean
  emptyMessage?: string
}>(), {
  columns: () => SCENARIO_ORDER,
  loading: false,
  emptyMessage: 'No difficulties match these filters',
})

const emit = defineEmits<{
  select: [row: ComplexityDifficultyRow]
  'update:page': [page: number]
  'update:sort': [request: ScenarioSortRequest]
}>()

type MapMetric = 'complexity' | 'topAp' | 'averageWeightedAp'

function currentValue(row: ComplexityDifficultyRow, key: MapMetric): number | null {
  return row.scenarios.CURRENT?.[key] ?? null
}

function scenarioValue(row: ComplexityDifficultyRow, key: MapMetric): number | null {
  return row.scenarios[props.scenario]?.[key] ?? null
}

function deltaValue(row: ComplexityDifficultyRow, key: MapMetric): number | null {
  return row.deltas[props.scenario]?.[key] ?? null
}

const { sortKey, sortDirection, deltaMode, sortState, absolute, onSort } = useSortState({
  deltaKeys: MAP_DELTA_KEYS,
  defaultKey: MAP_SORT_KEY,
  ascendingKeys: MAP_ASCENDING_KEYS,
})

watch([sortKey, sortDirection, absolute], () => {
  emit('update:sort', mapSortRequest(sortKey.value, sortDirection.value, absolute.value))
}, { immediate: true })

function deltaLabel(key: string, label: string): string {
  return sortState.value.key === key ? `${label} ${deltaMode.value}` : label
}

const tableColumns = computed<TableColumn[]>(() => {
  const tag = SCENARIO_SHORT[props.scenario]
  const list: TableColumn[] = [
    { key: 'song', label: 'Song', sortable: true, width: '260px' },
    { key: 'mapper', label: 'Mapper', width: '124px' },
    ...props.columns.map((scenario) => ({
      key: cxKey(scenario),
      label: `CX ${SCENARIO_SHORT[scenario]}`,
      sortable: true,
      align: 'right' as const,
      width: '104px',
    })),
    {
      key: 'cxDelta',
      label: deltaLabel('cxDelta', 'Δ CX'),
      sortable: true,
      align: 'right',
      width: '108px',
    },
    { key: 'topApCurrent', label: 'Top AP now', sortable: true, align: 'right', width: '116px' },
    { key: 'topAp', label: `Top AP ${tag}`, sortable: true, align: 'right', width: '120px' },
    {
      key: 'topApDelta',
      label: deltaLabel('topApDelta', 'Δ top AP'),
      sortable: true,
      align: 'right',
      width: '124px',
    },
    { key: 'avgWeightedCurrent', label: 'Avg wgt now', sortable: true, align: 'right', width: '124px' },
    { key: 'avgWeighted', label: `Avg wgt ${tag}`, sortable: true, align: 'right', width: '134px' },
    {
      key: 'avgWeightedDelta',
      label: deltaLabel('avgWeightedDelta', 'Δ avg wgt'),
      sortable: true,
      align: 'right',
      width: '132px',
    },
    { key: 'scores', label: 'Scores', sortable: true, align: 'right', width: '84px' },
  ]
  return list
})

const tableRows = computed(() =>
  props.rows.map((row) => {
    const cxDelta = deltaValue(row, 'complexity')
    const complexities = Object.fromEntries(
      props.columns.map((scenario) => [cxKey(scenario), row.scenarios[scenario]?.complexity ?? null]),
    )
    return {
      ...complexities,
      id: row.mapDifficultyId,
      source: row,
      mapper: row.mapAuthor,
      scores: row.scores,
      pinned: row.complexityPinned,
      cxCurrent: row.scenarios.CURRENT?.complexity ?? null,
      cxScenario: scenarioValue(row, 'complexity'),
      cxDelta,
      moved: !row.complexityPinned && isBigMove(cxDelta),
      topApCurrent: currentValue(row, 'topAp'),
      topAp: scenarioValue(row, 'topAp'),
      topApDelta: deltaValue(row, 'topAp'),
      avgWeightedCurrent: currentValue(row, 'averageWeightedAp'),
      avgWeighted: scenarioValue(row, 'averageWeightedAp'),
      avgWeightedDelta: deltaValue(row, 'averageWeightedAp'),
    }
  }),
)

function rowClass(row: Record<string, unknown>) {
  return row.moved ? 'complexity-maps__row--moved' : ''
}

</script>

<template>
  <div class="complexity-maps">
    <DataTable
      dense
      :columns="tableColumns"
      :rows="tableRows"
      :sort-state="sortState"
      :loading="loading"
      :loading-rows="10"
      row-key="id"
      row-clickable
      :row-class="rowClass"
      :empty-message="emptyMessage"
      @sort="onSort"
      @row-click="(row) => emit('select', row.source as ComplexityDifficultyRow)"
    >
      <template #cell-song="{ row }">
        <MapIdentityCell cover :row="(row.source as ComplexityDifficultyRow)" :size="34" />
      </template>

      <template #cell-mapper="{ row }">
        <span class="complexity-maps__mapper">{{ row.mapper }}</span>
      </template>

      <template v-for="key in columns" :key="key" #[`cell-${cxKey(key)}`]="{ row }">
        <span class="complexity-maps__cx">
          <ComplexityPin v-if="key === 'CURRENT' && row.pinned" />
          <ScenarioCell :value="(row[cxKey(key)] as number | null)" :decimals="CX_DECIMALS"
            :emphasis="key === 'CURRENT' || key === scenario" />
        </span>
      </template>

      <template #cell-cxDelta="{ row }">
        <span v-if="row.pinned" class="complexity-maps__pinned" :title="PIN_HINT">pinned</span>
        <ScenarioCell v-else delta-only :value="(row.cxDelta as number | null)"
          :delta="(row.cxDelta as number | null)" :decimals="CX_DECIMALS" big-threshold />
      </template>

      <template #cell-topApCurrent="{ row }">
        <ScenarioCell :value="(row.topApCurrent as number | null)" :decimals="AP_DECIMALS" />
      </template>

      <template #cell-topAp="{ row }">
        <ScenarioCell :value="(row.topAp as number | null)" :decimals="AP_DECIMALS" emphasis />
      </template>

      <template #cell-topApDelta="{ row }">
        <ScenarioCell delta-only :value="(row.topApDelta as number | null)"
          :delta="(row.topApDelta as number | null)" :decimals="AP_DECIMALS" />
      </template>

      <template #cell-avgWeightedCurrent="{ row }">
        <ScenarioCell :value="(row.avgWeightedCurrent as number | null)" :decimals="AP_DECIMALS" />
      </template>

      <template #cell-avgWeighted="{ row }">
        <ScenarioCell :value="(row.avgWeighted as number | null)" :decimals="AP_DECIMALS" emphasis />
      </template>

      <template #cell-avgWeightedDelta="{ row }">
        <ScenarioCell delta-only :value="(row.avgWeightedDelta as number | null)"
          :delta="(row.avgWeightedDelta as number | null)" :decimals="AP_DECIMALS" />
      </template>

      <template #cell-scores="{ row }">
        <span class="complexity-maps__scores">{{ formatCount(row.scores as number) }}</span>
      </template>

      <template #mobile-card="{ row }">
        <button type="button" class="complexity-maps__card"
          @click="emit('select', row.source as ComplexityDifficultyRow)">
          <MapIdentityCell cover :row="(row.source as ComplexityDifficultyRow)" :size="44" />
          <div class="complexity-maps__card-values">
            <span class="complexity-maps__card-label">CX</span>
            <ScenarioCell :value="(row.cxCurrent as number | null)" :decimals="CX_DECIMALS" emphasis />
            <ComplexityPin v-if="row.pinned" />
            <span class="complexity-maps__card-label" aria-hidden="true">&rarr;</span>
            <ScenarioCell :value="(row.cxScenario as number | null)"
              :delta="row.pinned ? null : (row.cxDelta as number | null)" :decimals="CX_DECIMALS"
              emphasis big-threshold />
          </div>
          <div class="complexity-maps__card-values">
            <span class="complexity-maps__card-label">Avg wgt</span>
            <ScenarioCell :value="(row.avgWeightedCurrent as number | null)"
              :decimals="AP_DECIMALS" />
            <span class="complexity-maps__card-label" aria-hidden="true">&rarr;</span>
            <ScenarioCell :value="(row.avgWeighted as number | null)"
              :delta="(row.avgWeightedDelta as number | null)" :decimals="AP_DECIMALS" emphasis />
          </div>
        </button>
      </template>

      <template #empty>
        <EmptyState :message="emptyMessage" />
      </template>
    </DataTable>

    <PaginationControls v-if="totalPages > 1" :page="page" :total-pages="totalPages"
      @update:page="emit('update:page', $event)" />
  </div>
</template>

<style scoped>
.complexity-maps {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  min-width: 0;
}

.complexity-maps :deep(.data-table__row.complexity-maps__row--moved) {
  background: color-mix(in srgb, var(--bg-surface) 93%, var(--warning) 7%);
}

.complexity-maps :deep(.data-table__row.complexity-maps__row--moved:nth-child(even)) {
  background: color-mix(in srgb, var(--bg-elevated) 93%, var(--warning) 7%);
}

.complexity-maps__cx {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
}

.complexity-maps__pinned {
  font-family: var(--font-mono);
  font-size: var(--text-body);
  color: var(--text-tertiary);
  cursor: help;
}

.complexity-maps__mapper {
  color: var(--text-secondary);
  font-size: var(--text-caption);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.complexity-maps__scores {
  font-family: var(--font-mono);
  font-size: var(--text-body);
  color: var(--text-secondary);
}

.complexity-maps__card-label {
  color: var(--text-tertiary);
  font-size: var(--text-caption);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.complexity-maps__card {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: var(--space-sm);
  width: 100%;
  padding: var(--space-md);
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  text-align: left;
  cursor: pointer;
}

.complexity-maps__card-values {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}
</style>
