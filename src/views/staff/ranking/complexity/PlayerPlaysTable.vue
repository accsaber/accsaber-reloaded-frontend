<script setup lang="ts">
import DataTable from '@/components/common/DataTable.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import type {
  ComparisonScenario,
  ComplexityDifficultyRow,
  ComplexityPlayerPlay,
  ComplexityScenario,
} from '@/types/api/complexity'
import type { TableColumn } from '@/types/display'
import { AP_DECIMALS, SCENARIO_SHORT } from '@/utils/complexity'
import { formatAccuracy } from '@/utils/formatters'
import MapIdentityCell from './MapIdentityCell.vue'
import ScenarioCell from './ScenarioCell.vue'
import { useScenarioSort } from './useScenarioSort'
import { computed, toRef } from 'vue'

type PlayMetric = 'ap' | 'weightedAp' | 'position' | 'rank'

const props = defineProps<{
  plays: ComplexityPlayerPlay[]
  scenario: ComparisonScenario
  columns: readonly ComplexityScenario[]
}>()

const METRICS: { key: PlayMetric; label: string; decimals: number; invert: boolean }[] = [
  { key: 'ap', label: 'AP', decimals: AP_DECIMALS, invert: false },
  { key: 'weightedAp', label: 'Wgt', decimals: AP_DECIMALS, invert: false },
  { key: 'position', label: 'Slot', decimals: 0, invert: true },
  { key: 'rank', label: 'Rank', decimals: 0, invert: true },
]

function cellKey(scenario: ComplexityScenario, metric: PlayMetric): string {
  return `${scenario}_${metric}`
}

function valueOf(
  play: ComplexityPlayerPlay,
  scenario: ComplexityScenario,
  metric: PlayMetric,
): number | null {
  return play.scenarios[scenario]?.[metric] ?? null
}

function deltaOf(play: ComplexityPlayerPlay, metric: PlayMetric): number | null {
  return play.deltas[props.scenario]?.[metric] ?? null
}

const accessors: Record<string, (play: ComplexityPlayerPlay) => number | string | null> = {
  song: (play) => play.difficulty.songName.toLowerCase(),
  accuracy: (play) => play.accuracy,
}

for (const scenario of props.columns) {
  for (const metric of METRICS) {
    accessors[cellKey(scenario, metric.key)] = (play) => valueOf(play, scenario, metric.key)
  }
}

const { sortState, visible, onSort } = useScenarioSort({
  rows: toRef(props, 'plays'),
  deltaKeys: [],
  defaultKey: cellKey('CURRENT', 'ap'),
  ascendingKeys: ['song'],
  pageSize: 100,
  revision: () => props.scenario,
  accessors,
})

const WIDTHS: Record<PlayMetric, string> = {
  ap: '104px',
  weightedAp: '104px',
  position: '104px',
  rank: '104px',
}

const tableColumns = computed<TableColumn[]>(() => [
  { key: 'song', label: 'Map', sortable: true, width: '200px', flex: true },
  { key: 'accuracy', label: 'Acc', sortable: true, align: 'right', width: '88px' },
  ...props.columns.flatMap((scenario) =>
    METRICS.map((metric) => ({
      key: cellKey(scenario, metric.key),
      label: `${metric.label} ${SCENARIO_SHORT[scenario]}`,
      sortable: true,
      align: 'right' as const,
      width: WIDTHS[metric.key],
    })),
  ),
])

const tableRows = computed(() =>
  visible.value.map((play) => {
    const cells: Record<string, unknown> = {}
    for (const scenario of props.columns) {
      for (const metric of METRICS) {
        cells[cellKey(scenario, metric.key)] = valueOf(play, scenario, metric.key)
        cells[`${cellKey(scenario, metric.key)}_delta`] =
          scenario === 'CURRENT' ? null : deltaOf(play, metric.key)
      }
    }
    return {
      ...cells,
      id: play.difficulty.mapDifficultyId,
      difficulty: play.difficulty,
      accuracy: play.accuracy,
    }
  }),
)

const cellDefinitions = computed(() =>
  props.columns.flatMap((scenario) =>
    METRICS.map((metric) => ({
      key: cellKey(scenario, metric.key),
      scenario,
      metric,
    })),
  ),
)
</script>

<template>
  <div class="plays-table">
    <DataTable
      dense
      :columns="tableColumns"
      :rows="tableRows"
      :sort-state="sortState"
      row-key="id"
      empty-message="No plays in this category"
      @sort="onSort"
    >
      <template #cell-song="{ row }">
        <MapIdentityCell cover :row="(row.difficulty as ComplexityDifficultyRow)" :size="30" />
      </template>

      <template #cell-accuracy="{ row }">
        <span class="plays-table__accuracy">{{ formatAccuracy(row.accuracy as number) }}</span>
      </template>

      <template v-for="cell in cellDefinitions" :key="cell.key" #[`cell-${cell.key}`]="{ row }">
        <ScenarioCell :value="(row[cell.key] as number | null)"
          :delta="(row[`${cell.key}_delta`] as number | null)" :decimals="cell.metric.decimals"
          :invert="cell.metric.invert" :emphasis="cell.scenario === scenario" />
      </template>

      <template #mobile-card="{ row }">
        <div class="plays-table__card">
          <MapIdentityCell cover :row="(row.difficulty as ComplexityDifficultyRow)" :size="40" />
          <div class="plays-table__card-values">
            <span class="plays-table__accuracy">{{ formatAccuracy(row.accuracy as number) }}</span>
            <ScenarioCell :value="(row[cellKey('CURRENT', 'ap')] as number | null)"
              :decimals="AP_DECIMALS" />
            <ScenarioCell :value="(row[cellKey(scenario, 'ap')] as number | null)"
              :delta="(row[`${cellKey(scenario, 'ap')}_delta`] as number | null)"
              :decimals="AP_DECIMALS" emphasis />
          </div>
        </div>
      </template>

      <template #empty>
        <EmptyState message="No plays in this category." />
      </template>
    </DataTable>
  </div>
</template>

<style scoped>
.plays-table {
  min-width: 0;
}

.plays-table__accuracy {
  font-family: var(--font-mono);
  font-size: var(--text-body);
  color: var(--text-secondary);
}

.plays-table__card {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  padding: var(--space-md);
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
}

.plays-table__card-values {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}
</style>
