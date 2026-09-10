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
  SCENARIO_ORDER,
  SCENARIO_SHORT,
  isBigMove,
} from '@/utils/complexity'
import { formatCount } from '@/utils/formatters'
import MapIdentityCell from './MapIdentityCell.vue'
import ScenarioCell from './ScenarioCell.vue'
import { cxKey } from './scenarioKeys'
import { useScenarioSort } from './useScenarioSort'
import { computed, toRef } from 'vue'

const props = withDefaults(defineProps<{
  rows: ComplexityDifficultyRow[]
  scenario: ComparisonScenario
  columns?: readonly ComplexityScenario[]
  loading?: boolean
  board?: boolean
  emptyMessage?: string
}>(), {
  columns: () => SCENARIO_ORDER,
  loading: false,
  board: false,
  emptyMessage: 'No difficulties match these filters',
})

const emit = defineEmits<{
  select: [row: ComplexityDifficultyRow]
}>()

type MapMetric = 'complexity' | 'topAp' | 'averageAp' | 'averageWeightedAp' | 'boardRank'

const ALL_SCENARIOS: readonly ComplexityScenario[] = ['CURRENT', 'NEW_SCRIPT', 'PREVIEW']

function currentValue(row: ComplexityDifficultyRow, key: MapMetric): number | null {
  return row.scenarios.CURRENT?.[key] ?? null
}

function scenarioValue(row: ComplexityDifficultyRow, key: MapMetric): number | null {
  return row.scenarios[props.scenario]?.[key] ?? null
}

function deltaValue(row: ComplexityDifficultyRow, key: MapMetric): number | null {
  return row.deltas[props.scenario]?.[key] ?? null
}

const accessors: Record<string, (row: ComplexityDifficultyRow) => number | string | null> = {
  song: (row) => row.songName.toLowerCase(),
  cxDelta: (row) => deltaValue(row, 'complexity'),
  topApCurrent: (row) => currentValue(row, 'topAp'),
  topAp: (row) => scenarioValue(row, 'topAp'),
  topApDelta: (row) => deltaValue(row, 'topAp'),
  avgWeightedCurrent: (row) => currentValue(row, 'averageWeightedAp'),
  avgWeighted: (row) => scenarioValue(row, 'averageWeightedAp'),
  avgWeightedDelta: (row) => deltaValue(row, 'averageWeightedAp'),
  scores: (row) => row.scores,
  board: (row) => row.scenarios[props.scenario]?.boardRank ?? null,
}

for (const key of ALL_SCENARIOS) {
  accessors[cxKey(key)] = (row) => row.scenarios[key]?.complexity ?? null
}

const { sortState, deltaMode, page, totalPages, visible, onSort, setPage } = useScenarioSort({
  rows: toRef(props, 'rows'),
  deltaKeys: ['cxDelta', 'topApDelta', 'avgWeightedDelta'],
  defaultKey: props.board ? 'avgWeighted' : 'cxDelta',
  ascendingKeys: ['song', 'board'],
  revision: () => props.scenario,
  accessors,
})

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
      label: `Δ CX ${deltaMode.value}`,
      sortable: true,
      align: 'right',
      width: '108px',
    },
    { key: 'topApCurrent', label: 'Top AP now', sortable: true, align: 'right', width: '116px' },
    { key: 'topAp', label: `Top AP ${tag}`, sortable: true, align: 'right', width: '120px' },
    {
      key: 'topApDelta',
      label: `Δ top AP ${deltaMode.value}`,
      sortable: true,
      align: 'right',
      width: '124px',
    },
    { key: 'avgWeightedCurrent', label: 'Avg wgt now', sortable: true, align: 'right', width: '124px' },
    { key: 'avgWeighted', label: `Avg wgt ${tag}`, sortable: true, align: 'right', width: '134px' },
    {
      key: 'avgWeightedDelta',
      label: `Δ avg wgt ${deltaMode.value}`,
      sortable: true,
      align: 'right',
      width: '132px',
    },
    { key: 'scores', label: 'Scores', sortable: true, align: 'right', width: '84px' },
  ]
  if (props.board) {
    list.splice(1, 0, { key: 'board', label: 'Board', sortable: true, align: 'center', width: '116px' })
  }
  return list
})

const tableRows = computed(() =>
  visible.value.map((row) => {
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
      cxCurrent: row.scenarios.CURRENT?.complexity ?? null,
      cxScenario: scenarioValue(row, 'complexity'),
      cxDelta,
      moved: isBigMove(cxDelta),
      topApCurrent: currentValue(row, 'topAp'),
      topAp: scenarioValue(row, 'topAp'),
      topApDelta: deltaValue(row, 'topAp'),
      avgWeightedCurrent: currentValue(row, 'averageWeightedAp'),
      avgWeighted: scenarioValue(row, 'averageWeightedAp'),
      avgWeightedDelta: deltaValue(row, 'averageWeightedAp'),
      boardNow: row.scenarios.CURRENT?.boardRank ?? null,
      boardMove: deltaValue(row, 'boardRank'),
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
      <template #cell-board="{ row }">
        <span class="complexity-maps__board">
          <span class="complexity-maps__board-pos">{{ row.boardNow != null ? `#${row.boardNow}` : '–' }}</span>
          <ScenarioCell delta-only invert :value="(row.boardMove as number | null)"
            :delta="(row.boardMove as number | null)" :decimals="0" />
        </span>
      </template>

      <template #cell-song="{ row }">
        <MapIdentityCell cover :row="(row.source as ComplexityDifficultyRow)" :size="34" />
      </template>

      <template #cell-mapper="{ row }">
        <span class="complexity-maps__mapper">{{ row.mapper }}</span>
      </template>

      <template v-for="key in columns" :key="key" #[`cell-${cxKey(key)}`]="{ row }">
        <ScenarioCell :value="(row[cxKey(key)] as number | null)" :decimals="CX_DECIMALS"
          :emphasis="key === 'CURRENT' || key === scenario" />
      </template>

      <template #cell-cxDelta="{ row }">
        <ScenarioCell delta-only :value="(row.cxDelta as number | null)"
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
            <span class="complexity-maps__card-label" aria-hidden="true">&rarr;</span>
            <ScenarioCell :value="(row.cxScenario as number | null)"
              :delta="(row.cxDelta as number | null)" :decimals="CX_DECIMALS" emphasis big-threshold />
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
      @update:page="setPage" />
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

.complexity-maps__board {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
}

.complexity-maps__board-pos {
  font-family: var(--font-mono);
  font-size: var(--text-body);
  color: var(--text-primary);
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
