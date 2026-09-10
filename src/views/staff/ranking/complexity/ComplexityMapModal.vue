<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import GlowImage from '@/components/common/GlowImage.vue'
import CategoryBadge from '@/components/domain/CategoryBadge.vue'
import DifficultyBadge from '@/components/domain/DifficultyBadge.vue'
import ScoreTable from '@/components/domain/ScoreTable.vue'
import { pickAvatarFallback, pickAvatarUrl, pickCoverFallback, pickCoverUrl } from '@/composables/useAvatarFallback'
import type {
  ComplexityDifficultyRow,
  ComplexityMapLeaderboard,
  ComplexityScoreRow,
  EstimateScenario,
} from '@/types/api/complexity'
import type { CategoryCode, TableColumn } from '@/types/display'
import { AP_DECIMALS, CX_DECIMALS, ESTIMATE_SCENARIOS, SCENARIO_SHORT } from '@/utils/complexity'
import { formatAccuracy, formatCount } from '@/utils/formatters'
import EstimateInputs from './EstimateInputs.vue'
import ScenarioCell from './ScenarioCell.vue'
import { isStaleEstimate } from './estimates'
import { useScenarioSort } from './useScenarioSort'
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  open: boolean
  row: ComplexityDifficultyRow | null
  leaderboard: ComplexityMapLeaderboard | null
  scenario: EstimateScenario
  modelHash: string | null
  loading?: boolean
  error?: string
}>()

const emit = defineEmits<{
  close: []
}>()

const inputsOpen = ref(false)

watch(() => props.row?.mapDifficultyId, () => {
  inputsOpen.value = false
})

const difficulty = computed(() => props.leaderboard?.difficulty ?? props.row)

const title = computed(() => {
  const source = difficulty.value
  return source ? `${source.songAuthor} - ${source.songName}` : 'Map calibration'
})

const scoreRows = computed<ComplexityScoreRow[]>(() => props.leaderboard?.rows ?? [])

function apOf(row: ComplexityScoreRow, scenario: EstimateScenario | 'CURRENT'): number | null {
  return row.scenarios[scenario]?.ap ?? null
}

const { sortState, deltaMode, page, totalPages, visible, onSort, setPage } = useScenarioSort({
  rows: scoreRows,
  deltaKeys: ['apMove', 'rankMove'],
  defaultKey: 'rank',
  ascendingKeys: ['rank', 'rankScenario'],
  revision: () => props.scenario,
  accessors: {
    rank: (row) => row.scenarios.CURRENT?.rank ?? null,
    accuracy: (row) => row.accuracy,
    apCurrent: (row) => apOf(row, 'CURRENT'),
    apOld: (row) => apOf(row, 'OLD_SCRIPT'),
    apNew: (row) => apOf(row, 'NEW_SCRIPT'),
    apMove: (row) => row.deltas[props.scenario]?.ap ?? null,
    weighted: (row) => row.scenarios[props.scenario]?.weightedAp ?? null,
    rankScenario: (row) => row.scenarios[props.scenario]?.rank ?? null,
    rankMove: (row) => row.deltas[props.scenario]?.rank ?? null,
  },
})

const columns = computed<TableColumn[]>(() => {
  const tag = SCENARIO_SHORT[props.scenario]
  return [
    { key: 'rank', label: 'Rank', sortable: true, align: 'right', width: '88px' },
    { key: 'player', label: 'Player', width: '190px', flex: true },
    { key: 'accuracy', label: 'Accuracy', sortable: true, align: 'right', width: '112px' },
    { key: 'apCurrent', label: 'AP now', sortable: true, align: 'right', width: '96px' },
    { key: 'apOld', label: 'AP old', sortable: true, align: 'right', width: '96px' },
    { key: 'apNew', label: 'AP new', sortable: true, align: 'right', width: '96px' },
    {
      key: 'apMove',
      label: `Δ AP ${deltaMode.value}`,
      sortable: true,
      align: 'right',
      width: '112px',
    },
    { key: 'weighted', label: 'Weighted', sortable: true, align: 'right', width: '112px' },
    { key: 'rankScenario', label: `Rank ${tag}`, sortable: true, align: 'right', width: '104px' },
    {
      key: 'rankMove',
      label: `Δ rank ${deltaMode.value}`,
      sortable: true,
      align: 'right',
      width: '132px',
    },
  ]
})

const tableRows = computed(() =>
  visible.value.map((row) => ({
    id: row.userId,
    userId: row.userId,
    name: row.name,
    country: row.country,
    avatarUrl: pickAvatarUrl(row),
    avatarFallbackUrl: pickAvatarFallback(row),
    rank: row.scenarios.CURRENT?.rank ?? null,
    accuracy: row.accuracy,
    apCurrent: apOf(row, 'CURRENT'),
    apOld: apOf(row, 'OLD_SCRIPT'),
    apNew: apOf(row, 'NEW_SCRIPT'),
    apMove: row.deltas[props.scenario]?.ap ?? null,
    weighted: row.scenarios[props.scenario]?.weightedAp ?? null,
    rankScenario: row.scenarios[props.scenario]?.rank ?? null,
    rankMove: row.deltas[props.scenario]?.rank ?? null,
  })),
)

const complexities = computed(() => {
  const source = difficulty.value
  if (!source) return []
  return [
    { key: 'CURRENT', label: 'Now', value: source.scenarios.CURRENT?.complexity ?? null, delta: null },
    {
      key: 'OLD_SCRIPT',
      label: 'Old script',
      value: source.scenarios.OLD_SCRIPT?.complexity ?? null,
      delta: source.deltas.OLD_SCRIPT?.complexity ?? null,
    },
    {
      key: 'NEW_SCRIPT',
      label: 'New script',
      value: source.scenarios.NEW_SCRIPT?.complexity ?? null,
      delta: source.deltas.NEW_SCRIPT?.complexity ?? null,
    },
  ]
})

const coverUrl = computed(() => pickCoverUrl(difficulty.value))
const coverFallback = computed(() => pickCoverFallback(difficulty.value))

function playerRoute(row: Record<string, unknown>) {
  return { name: 'player-profile', params: { userId: row.userId as string } }
}
</script>

<template>
  <BaseModal :open="open" :title="title" max-width="1180px" @close="emit('close')">
    <div v-if="difficulty" class="map-modal">
      <header class="map-modal__head">
        <GlowImage :src="coverUrl" alt="" :size="64" :fallback-src="coverFallback" />
        <div class="map-modal__identity">
          <div class="map-modal__badges">
            <CategoryBadge :category="(difficulty.categoryCode as CategoryCode)" />
            <DifficultyBadge :difficulty="difficulty.difficulty" />
            <span v-if="difficulty.status !== 'RANKED'" class="status-pill"
              :class="`status-pill--${difficulty.status.toLowerCase()}`">{{ difficulty.status }}</span>
          </div>
          <span class="map-modal__mapper">{{ difficulty.mapAuthor }}</span>
          <span class="map-modal__scores">{{ formatCount(difficulty.scores) }} active scores</span>
        </div>
        <div class="map-modal__complexities">
          <div v-for="entry in complexities" :key="entry.key" class="map-modal__complexity">
            <span class="map-modal__complexity-label">{{ entry.label }}</span>
            <ScenarioCell :value="entry.value" :delta="entry.delta" :decimals="CX_DECIMALS"
              big-threshold :emphasis="entry.key === 'CURRENT' || entry.key === scenario" />
          </div>
        </div>
      </header>

      <div class="map-modal__inputs">
        <BaseButton size="sm" @click="inputsOpen = !inputsOpen">
          {{ inputsOpen ? 'Hide estimate inputs' : 'Show estimate inputs' }}
        </BaseButton>
        <div v-if="inputsOpen" class="map-modal__inputs-body">
          <EstimateInputs v-for="source in ESTIMATE_SCENARIOS" :key="source" :scenario="source"
            :estimate="difficulty.estimates[source]"
            :stale="isStaleEstimate(difficulty.estimates[source], modelHash)" />
        </div>
      </div>

      <p v-if="error" class="map-modal__error">{{ error }}</p>

      <ScoreTable
        medal-ranks
        :columns="columns"
        :rows="tableRows"
        :sort-state="sortState"
        :loading="loading"
        :loading-rows="8"
        :page="page"
        :total-pages="totalPages"
        row-key="id"
        :row-to="playerRoute"
        empty-message="No active scores on this difficulty"
        @sort="onSort"
        @update:page="setPage"
      >
        <template #cell-player="{ row }">
          <div class="map-modal__player">
            <GlowImage :src="row.avatarUrl as string" :alt="(row.name as string)" :size="28"
              :fallback-src="(row.avatarFallbackUrl as string | null)" />
            <span class="map-modal__player-name">{{ row.name }}</span>
          </div>
        </template>

        <template #cell-accuracy="{ row }">
          <span class="map-modal__accuracy">{{ formatAccuracy(row.accuracy as number) }}</span>
        </template>

        <template #cell-apCurrent="{ row }">
          <ScenarioCell :value="(row.apCurrent as number | null)" :decimals="AP_DECIMALS" emphasis />
        </template>

        <template #cell-apOld="{ row }">
          <ScenarioCell :value="(row.apOld as number | null)" :decimals="AP_DECIMALS"
            :emphasis="scenario === 'OLD_SCRIPT'" />
        </template>

        <template #cell-apNew="{ row }">
          <ScenarioCell :value="(row.apNew as number | null)" :decimals="AP_DECIMALS"
            :emphasis="scenario === 'NEW_SCRIPT'" />
        </template>

        <template #cell-apMove="{ row }">
          <ScenarioCell delta-only :value="(row.apMove as number | null)"
            :delta="(row.apMove as number | null)" :decimals="AP_DECIMALS" />
        </template>

        <template #cell-weighted="{ row }">
          <ScenarioCell :value="(row.weighted as number | null)" :decimals="AP_DECIMALS" emphasis />
        </template>

        <template #cell-rankScenario="{ row }">
          <span class="map-modal__rank">
            {{ row.rankScenario != null ? `#${row.rankScenario}` : '–' }}
          </span>
        </template>

        <template #cell-rankMove="{ row }">
          <ScenarioCell delta-only invert :value="(row.rankMove as number | null)"
            :delta="(row.rankMove as number | null)" :decimals="0" />
        </template>
      </ScoreTable>
    </div>
  </BaseModal>
</template>

<style scoped>
.map-modal {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.map-modal__head {
  display: flex;
  align-items: flex-start;
  gap: var(--space-md);
  flex-wrap: wrap;
}

.map-modal__identity {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  flex: 1;
  min-width: 180px;
}

.map-modal__badges {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex-wrap: wrap;
}

.map-modal__mapper {
  color: var(--text-primary);
  font-size: var(--text-body);
}

.map-modal__scores {
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

.map-modal__complexities {
  display: flex;
  gap: var(--space-lg);
}

.map-modal__complexity {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.map-modal__complexity-label {
  color: var(--text-tertiary);
  font-size: var(--text-caption);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.map-modal__inputs {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-md);
  padding-top: var(--space-md);
  border-top: 1px solid var(--bg-overlay);
}

.map-modal__inputs-body {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: var(--space-lg);
}

.map-modal__error {
  margin: 0;
  color: var(--error);
  font-size: var(--text-body);
}

.map-modal__player {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  min-width: 0;
}

.map-modal__player-name {
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.map-modal__accuracy,
.map-modal__rank {
  font-family: var(--font-mono);
  color: var(--text-secondary);
}

@media (max-width: 767px) {
  .map-modal__complexities {
    gap: var(--space-md);
    width: 100%;
    justify-content: space-between;
  }
}
</style>
