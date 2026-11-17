<script setup lang="ts">
import DataTable from '@/components/common/DataTable.vue'
import PaginationControls from '@/components/common/PaginationControls.vue'
import UserChip from '@/components/domain/UserChip.vue'
import type { ComparisonScenario, ComplexityPlayerRow, ComplexityScenario } from '@/types/api/complexity'
import type { TableColumn, UserRefDisplay } from '@/types/display'
import { AP_DECIMALS } from '@/utils/complexity'
import ScenarioCell from './ScenarioCell.vue'
import SortBasisTabs from './SortBasisTabs.vue'
import { apKey } from './scenarioKeys'
import { useScenarioSort, useSortBasis } from './useScenarioSort'
import { computed, toRef } from 'vue'

const props = withDefaults(defineProps<{
  rows: ComplexityPlayerRow[]
  scenario: ComparisonScenario
  loading?: boolean
}>(), {
  loading: false,
})

const emit = defineEmits<{
  select: [userId: string]
}>()

const PAGE_ROWS = 50
const ALL_SCENARIOS: readonly ComplexityScenario[] = ['CURRENT', 'NEW_SCRIPT', 'PREVIEW']

const accessors: Record<string, (row: ComplexityPlayerRow) => number | string | null> = {
  rankCurrent: (row) => row.scenarios.CURRENT?.rank ?? null,
  rankScenario: (row) => row.scenarios[props.scenario]?.rank ?? null,
  rankMove: (row) => row.deltas[props.scenario]?.rank ?? null,
  apMove: (row) => row.deltas[props.scenario]?.ap ?? null,
  ...Object.fromEntries(ALL_SCENARIOS.map((key) => [apKey(key), (row: ComplexityPlayerRow) => row.scenarios[key]?.ap ?? null])),
}

const sort = useScenarioSort({
  rows: toRef(props, 'rows'),
  deltaKeys: ['apMove', 'rankMove'],
  defaultKey: 'rankCurrent',
  ascendingKeys: ['rankCurrent', 'rankScenario'],
  pageSize: PAGE_ROWS,
  revision: () => props.scenario,
  accessors,
})
const { sortState, page, totalPages, visible, onSort, setPage } = sort

const { basis, keyOf, setBasis, label } = useSortBasis(
  () => ({
    rank: { change: 'rankMove', now: 'rankCurrent', after: 'rankScenario' },
    ap: { change: 'apMove', now: apKey('CURRENT'), after: apKey(props.scenario) },
  }),
  sort,
  'now',
)

const rankColumn = computed(() => keyOf('rank'))
const apColumn = computed(() => keyOf('ap'))

const columns = computed<TableColumn[]>(() => [
  { key: rankColumn.value, label: label('rank', 'Rank'), sortable: true, align: 'right', width: '160px' },
  { key: 'player', label: 'Player', primary: true },
  { key: apColumn.value, label: label('ap', 'AP'), sortable: true, align: 'right', width: '260px' },
])

const tableRows = computed<Record<string, unknown>[]>(() => visible.value.map((row) => ({ id: row.player.id, source: row })))

function sourceOf(row: Record<string, unknown>): ComplexityPlayerRow {
  return row.source as ComplexityPlayerRow
}
</script>

<template>
  <div class="complexity-players">
    <div class="complexity-players__bar">
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
      :row-height="56"
      row-key="id"
      row-clickable
      empty-message="No players on this board yet"
      @sort="onSort"
      @row-click="(row) => emit('select', row.id as string)"
    >
      <template #[`cell-${rankColumn}`]="{ row }">
        <ScenarioCell
          :entry="sourceOf(row)" field="rank" :scenario="scenario"
          :decimals="0"
          invert
          emphasis
        />
      </template>
      <template #cell-player="{ row }">
        <UserChip :user="(sourceOf(row).player as UserRefDisplay)" />
      </template>
      <template #[`cell-${apColumn}`]="{ row }">
        <ScenarioCell
          :entry="sourceOf(row)" field="ap" :scenario="scenario"
          :decimals="AP_DECIMALS"
          emphasis
        />
      </template>
    </DataTable>

    <div class="complexity-players__pages">
      <PaginationControls v-if="totalPages > 1" :page="page" :total-pages="totalPages" @update:page="setPage" />
    </div>
  </div>
</template>

<style scoped>
.complexity-players {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  min-width: 0;
}

.complexity-players__bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-sm);
}


.complexity-players__pages {
  min-height: var(--control-h);
}
</style>
