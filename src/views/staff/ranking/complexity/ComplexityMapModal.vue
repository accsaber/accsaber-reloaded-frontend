<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import ScoreTable from '@/components/domain/ScoreTable.vue'
import UserChip from '@/components/domain/UserChip.vue'
import type {
  ComparisonScenario,
  ComplexityDifficultyRow,
  ComplexityMapLeaderboard,
  ComplexityScoreRow,
} from '@/types/api/complexity'
import type { TableColumn, UserRefDisplay } from '@/types/display'
import { AP_DECIMALS, CX_DECIMALS, SCRIPT_SCENARIO } from '@/utils/complexity'
import { formatAccuracy, formatCount } from '@/utils/formatters'
import EstimateInputs from './EstimateInputs.vue'
import MapIdentityCell from './MapIdentityCell.vue'
import ScenarioCell from './ScenarioCell.vue'
import SortBasisTabs from './SortBasisTabs.vue'
import { isStaleEstimate } from './estimates'
import {
  LEADERBOARD_ASCENDING_KEYS,
  LEADERBOARD_DELTA_KEYS,
  LEADERBOARD_SORT_KEY,
  leaderboardSortRequest,
  type ScenarioSortRequest,
} from './scenarioKeys'
import { useSortBasis, useSortState } from './useScenarioSort'
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  open: boolean
  row: ComplexityDifficultyRow | null
  leaderboard: ComplexityMapLeaderboard | null
  scenario: ComparisonScenario
  modelHash: string | null
  page: number
  totalPages: number
  loading?: boolean
  error?: string
}>()

const emit = defineEmits<{
  close: []
  selectPlayer: [userId: string]
  'update:page': [page: number]
  'update:sort': [request: ScenarioSortRequest]
}>()

const PAGE_ROWS = 50
const METRICS = [
  { name: 'ap', field: 'ap', label: 'AP', width: '200px' },
  { name: 'weighted', field: 'weightedAp', label: 'Weighted', width: '200px' },
] as const

const inputsOpen = ref(false)

watch(() => props.row?.map.id, () => {
  inputsOpen.value = false
})

const difficulty = computed(() => props.leaderboard?.difficulty ?? props.row)

const title = computed(() => {
  const source = difficulty.value
  return source ? `${source.map.songAuthor} - ${source.map.songName}` : 'Map'
})

const sort = useSortState({
  deltaKeys: LEADERBOARD_DELTA_KEYS,
  defaultKey: LEADERBOARD_SORT_KEY,
  ascendingKeys: LEADERBOARD_ASCENDING_KEYS,
})
const { sortKey, sortDirection, sortState, absolute, onSort } = sort

const { basis, keyOf, setBasis, label } = useSortBasis(
  () => ({
    ap: { change: 'apMove', now: 'apCurrent', after: 'apScenario' },
    weighted: { change: 'weightedMove', now: 'weightedCurrent', after: 'weightedScenario' },
  }),
  sort,
)

watch([sortKey, sortDirection, absolute], () => {
  emit('update:sort', leaderboardSortRequest(sortKey.value, sortDirection.value, absolute.value))
}, { immediate: true })

const columns = computed<TableColumn[]>(() => [
  { key: 'rank', label: 'Rank', sortable: true, align: 'right', width: '84px' },
  { key: 'player', label: 'Player', primary: true },
  { key: 'accuracy', label: 'Accuracy', sortable: true, align: 'right', mono: true, width: '112px', format: (v) => formatAccuracy(v as number) },
  ...METRICS.map((m) => ({ key: keyOf(m.name), label: label(m.name, m.label), sortable: true, align: 'right' as const, width: m.width })),
])

const tableRows = computed<Record<string, unknown>[]>(() =>
  (props.leaderboard?.rows ?? []).map((row) => ({
    id: row.player.id,
    rank: row.scenarios.CURRENT?.rank ?? null,
    accuracy: row.accuracy,
    score: row,
  })),
)

function scoreOf(row: Record<string, unknown>): ComplexityScoreRow {
  return row.score as ComplexityScoreRow
}
</script>

<template>
  <BaseModal :open="open" :title="title" max-width="1100px" @close="emit('close')">
    <div v-if="difficulty" class="map-modal">
      <header class="map-modal__head">
        <MapIdentityCell class="map-modal__identity" :row="difficulty" :size="56" />
        <div class="map-modal__fact">
          <span class="field-label">Complexity</span>
          <ScenarioCell
            :entry="difficulty" field="complexity" :scenario="scenario"
            :decimals="CX_DECIMALS"
            big-threshold
            emphasis
          />
        </div>
        <div class="map-modal__fact">
          <span class="field-label">Scores</span>
          <span class="map-modal__count">{{ formatCount(difficulty.scores) }}</span>
        </div>
      </header>

      <div class="map-modal__bar">
        <BaseButton :aria-expanded="inputsOpen" @click="inputsOpen = !inputsOpen">
          {{ inputsOpen ? 'Hide Estimate Inputs' : 'Show Estimate Inputs' }}
        </BaseButton>
        <SortBasisTabs :basis="basis" @change="setBasis" />
      </div>

      <Transition name="collapse">
        <div v-if="inputsOpen" class="collapsible">
          <EstimateInputs :scenario="SCRIPT_SCENARIO" :estimate="difficulty.estimates[SCRIPT_SCENARIO]" :complexity="difficulty.scenarios[SCRIPT_SCENARIO]?.complexity"
            :stale="isStaleEstimate(difficulty.estimates[SCRIPT_SCENARIO], modelHash)" />
        </div>
      </Transition>

      <p v-if="error" class="caption map-modal__error" role="alert">{{ error }}</p>

      <ScoreTable
        medal-ranks
        :columns="columns"
        :rows="tableRows"
        :sort-state="sortState"
        :loading="loading && !tableRows.length"
        :refreshing="loading && tableRows.length > 0"
        :loading-rows="Math.min(difficulty.scores, PAGE_ROWS)"
        :page="page"
        :total-pages="totalPages"
        row-key="id"
        row-clickable
        empty-message="No active scores on this difficulty"
        @sort="onSort"
        @update:page="emit('update:page', $event)"
        @row-click="(row) => emit('selectPlayer', row.id as string)"
      >
        <template #cell-player="{ row }">
          <UserChip :user="(scoreOf(row).player as UserRefDisplay)" size="sm" />
        </template>
        <template v-for="m in METRICS" :key="m.name" #[`cell-${keyOf(m.name)}`]="{ row }">
          <ScenarioCell
            :entry="scoreOf(row)" :field="m.field" :scenario="scenario"
            :decimals="AP_DECIMALS"
            emphasis
          />
        </template>
      </ScoreTable>
    </div>
  </BaseModal>
</template>

<style scoped>
.map-modal {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  min-height: 70vh;
}

.map-modal__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-md) var(--space-2xl);
}

.map-modal__identity {
  flex: 1;
  min-width: 240px;
}

.map-modal__fact {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--space-xs);
}

.map-modal__count {
  font-family: var(--font-mono);
  font-weight: 600;
  color: var(--text-primary);
}

.map-modal__bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
}


.map-modal__error {
  color: var(--error);
}
</style>
