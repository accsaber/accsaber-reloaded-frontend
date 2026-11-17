<script setup lang="ts">
import DataTable from '@/components/common/DataTable.vue'
import type { ComparisonScenario, ComplexityDifficultyRow, ComplexityPlayerPlay } from '@/types/api/complexity'
import type { TableColumn } from '@/types/display'
import { AP_DECIMALS } from '@/utils/complexity'
import { formatAccuracy } from '@/utils/formatters'
import MapIdentityCell from './MapIdentityCell.vue'
import ScenarioCell from './ScenarioCell.vue'
import SortBasisTabs from './SortBasisTabs.vue'
import { useScenarioSort, useSortBasis, type BasisKeys } from './useScenarioSort'
import { computed, toRef } from 'vue'

const props = defineProps<{
  plays: ComplexityPlayerPlay[]
  scenario: ComparisonScenario
}>()

const MAX_ROWS = 100
const METRICS = [
  { key: 'ap', label: 'AP', decimals: AP_DECIMALS, invert: false, width: '190px' },
  { key: 'weightedAp', label: 'Weighted', decimals: AP_DECIMALS, invert: false, width: '190px' },
  { key: 'position', label: 'List', decimals: 0, invert: true, width: '130px' },
  { key: 'rank', label: 'Rank', decimals: 0, invert: true, width: '130px' },
] as const

const BASIS_KEYS: BasisKeys = Object.fromEntries(
  METRICS.map((m) => [m.key, { change: `${m.key}_change`, now: `${m.key}_now`, after: `${m.key}_after` }]),
)

const accessors: Record<string, (play: ComplexityPlayerPlay) => number | string | null> = {
  song: (play) => play.difficulty.map.songName.toLowerCase(),
  accuracy: (play) => play.accuracy,
}
for (const m of METRICS) {
  accessors[`${m.key}_now`] = (play) => play.scenarios.CURRENT?.[m.key] ?? null
  accessors[`${m.key}_after`] = (play) => play.scenarios[props.scenario]?.[m.key] ?? null
  accessors[`${m.key}_change`] = (play) => play.deltas[props.scenario]?.[m.key] ?? null
}

const sort = useScenarioSort({
  rows: toRef(props, 'plays'),
  deltaKeys: METRICS.map((m) => `${m.key}_change`),
  defaultKey: 'ap_now',
  ascendingKeys: ['song', ...METRICS.filter((m) => m.invert).flatMap((m) => [`${m.key}_now`, `${m.key}_after`])],
  pageSize: MAX_ROWS,
  revision: () => props.scenario,
  accessors,
})
const { sortState, visible, onSort } = sort
const { basis, keyOf, setBasis, label } = useSortBasis(() => BASIS_KEYS, sort, 'now')

const columns = computed<TableColumn[]>(() => [
  { key: 'song', label: 'Map', sortable: true, primary: true },
  { key: 'accuracy', label: 'Accuracy', sortable: true, align: 'right', mono: true, width: '110px', format: (v) => formatAccuracy(v as number) },
  ...METRICS.map((m) => ({ key: keyOf(m.key), label: label(m.key, m.label), sortable: true, align: 'right' as const, width: m.width })),
])

const rows = computed<Record<string, unknown>[]>(() =>
  visible.value.map((play) => ({ id: play.difficulty.map.id, accuracy: play.accuracy, play })),
)

function playOf(row: Record<string, unknown>): ComplexityPlayerPlay {
  return row.play as ComplexityPlayerPlay
}
</script>

<template>
  <div class="plays-table">
    <SortBasisTabs :basis="basis" @change="setBasis" />

    <DataTable :columns="columns" :rows="rows" :sort-state="sortState" :row-height="64" row-key="id"
      empty-message="No plays in this category" @sort="onSort">
      <template #cell-song="{ row }">
        <MapIdentityCell :row="(playOf(row).difficulty as ComplexityDifficultyRow)" />
      </template>
      <template v-for="m in METRICS" :key="m.key" #[`cell-${keyOf(m.key)}`]="{ row }">
        <ScenarioCell
          :entry="playOf(row)" :field="m.key" :scenario="scenario"
          :decimals="m.decimals"
          :invert="m.invert"
          emphasis
        />
      </template>
    </DataTable>
  </div>
</template>

<style scoped>
.plays-table {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  min-width: 0;
}

</style>
