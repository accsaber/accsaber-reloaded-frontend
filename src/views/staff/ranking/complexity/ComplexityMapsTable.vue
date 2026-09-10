<script setup lang="ts">
import DataTable from '@/components/common/DataTable.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import GlowImage from '@/components/common/GlowImage.vue'
import PaginationControls from '@/components/common/PaginationControls.vue'
import CategoryBadge from '@/components/domain/CategoryBadge.vue'
import DifficultyBadge from '@/components/domain/DifficultyBadge.vue'
import SongTitle from '@/components/domain/SongTitle.vue'
import { pickCoverFallback, pickCoverUrl } from '@/composables/useAvatarFallback'
import type { ComplexityDifficultyRow, EstimateScenario } from '@/types/api/complexity'
import type { CategoryCode, TableColumn } from '@/types/display'
import { AP_DECIMALS, CX_DECIMALS, isBigMove } from '@/utils/complexity'
import { formatCount } from '@/utils/formatters'
import ScenarioCell from './ScenarioCell.vue'
import { useScenarioSort } from './useScenarioSort'
import { computed, toRef } from 'vue'

const props = withDefaults(defineProps<{
  rows: ComplexityDifficultyRow[]
  scenario: EstimateScenario
  loading?: boolean
  board?: boolean
  emptyMessage?: string
}>(), {
  loading: false,
  board: false,
  emptyMessage: 'No difficulties match these filters',
})

const emit = defineEmits<{
  select: [row: ComplexityDifficultyRow]
}>()

type MapMetric = 'complexity' | 'topAp' | 'averageWeightedAp' | 'boardRank'

function scenarioValue(row: ComplexityDifficultyRow, key: MapMetric): number | null {
  return row.scenarios[props.scenario]?.[key] ?? null
}

function deltaValue(row: ComplexityDifficultyRow, key: MapMetric): number | null {
  return row.deltas[props.scenario]?.[key] ?? null
}

const { sortState, deltaMode, page, totalPages, visible, onSort, setPage } = useScenarioSort({
  rows: toRef(props, 'rows'),
  deltaKeys: ['cxDelta'],
  defaultKey: props.board ? 'avgWeighted' : 'cxDelta',
  ascendingKeys: ['song', 'board'],
  revision: () => props.scenario,
  accessors: {
    song: (row) => row.songName.toLowerCase(),
    cxCurrent: (row) => row.scenarios.CURRENT?.complexity ?? null,
    cxOld: (row) => row.scenarios.OLD_SCRIPT?.complexity ?? null,
    cxNew: (row) => row.scenarios.NEW_SCRIPT?.complexity ?? null,
    cxDelta: (row) => deltaValue(row, 'complexity'),
    board: (row) => row.scenarios[props.scenario]?.boardRank ?? null,
    topAp: (row) => scenarioValue(row, 'topAp'),
    avgWeighted: (row) => scenarioValue(row, 'averageWeightedAp'),
    scores: (row) => row.scores,
  },
})

const columns = computed<TableColumn[]>(() => {
  const list: TableColumn[] = [
    { key: 'cover', label: '', width: '56px', noLink: true },
    { key: 'song', label: 'Song', sortable: true, width: '300px' },
    { key: 'mapper', label: 'Mapper', width: '150px' },
    { key: 'cxCurrent', label: 'CX now', sortable: true, align: 'right', width: '84px' },
    { key: 'cxOld', label: 'CX old', sortable: true, align: 'right', width: '84px' },
    { key: 'cxNew', label: 'CX new', sortable: true, align: 'right', width: '84px' },
    {
      key: 'cxDelta',
      label: `Δ CX ${deltaMode.value}`,
      sortable: true,
      align: 'right',
      width: '112px',
    },
    { key: 'topAp', label: 'Top AP', sortable: true, align: 'right', width: '104px' },
    { key: 'avgWeighted', label: 'Avg wgt', sortable: true, align: 'right', width: '112px' },
    { key: 'scores', label: 'Scores', sortable: true, align: 'right', width: '82px' },
  ]
  if (props.board) {
    list.unshift({ key: 'board', label: 'Board', sortable: true, align: 'center', width: '120px' })
  }
  return list
})

const tableRows = computed(() =>
  visible.value.map((row) => {
    const cxDelta = deltaValue(row, 'complexity')
    return {
      id: row.mapDifficultyId,
      source: row,
      coverUrl: pickCoverUrl(row),
      coverFallbackUrl: pickCoverFallback(row),
      songName: row.songName,
      songSubName: row.songSubName,
      songAuthor: row.songAuthor,
      mapper: row.mapAuthor,
      difficulty: row.difficulty,
      categoryCode: row.categoryCode as CategoryCode,
      status: row.status,
      scores: row.scores,
      cxCurrent: row.scenarios.CURRENT?.complexity ?? null,
      cxOld: row.scenarios.OLD_SCRIPT?.complexity ?? null,
      cxNew: row.scenarios.NEW_SCRIPT?.complexity ?? null,
      cxScenario: scenarioValue(row, 'complexity'),
      cxDelta,
      moved: isBigMove(cxDelta),
      topAp: scenarioValue(row, 'topAp'),
      topApDelta: deltaValue(row, 'topAp'),
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
      :columns="columns"
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

      <template #cell-cover="{ row }">
        <GlowImage :src="row.coverUrl as string" alt="" :size="36"
          :fallback-src="(row.coverFallbackUrl as string | null)" />
      </template>

      <template #cell-song="{ row }">
        <div class="complexity-maps__song">
          <SongTitle class="complexity-maps__song-name" :name="(row.songName as string)"
            :sub-name="(row.songSubName as string | null)" />
          <span class="complexity-maps__song-meta">
            <CategoryBadge :category="(row.categoryCode as CategoryCode)" size="sm" />
            <DifficultyBadge :difficulty="(row.difficulty as string)" />
            <span v-if="row.status !== 'RANKED'" class="status-pill"
              :class="`status-pill--${String(row.status).toLowerCase()}`">{{ row.status }}</span>
            <span class="complexity-maps__artist">{{ row.songAuthor }}</span>
          </span>
        </div>
      </template>

      <template #cell-mapper="{ row }">
        <span class="complexity-maps__mapper">{{ row.mapper }}</span>
      </template>

      <template #cell-cxCurrent="{ row }">
        <ScenarioCell :value="(row.cxCurrent as number | null)" :decimals="CX_DECIMALS" emphasis />
      </template>

      <template #cell-cxOld="{ row }">
        <ScenarioCell :value="(row.cxOld as number | null)" :decimals="CX_DECIMALS"
          :emphasis="scenario === 'OLD_SCRIPT'" />
      </template>

      <template #cell-cxNew="{ row }">
        <ScenarioCell :value="(row.cxNew as number | null)" :decimals="CX_DECIMALS"
          :emphasis="scenario === 'NEW_SCRIPT'" />
      </template>

      <template #cell-cxDelta="{ row }">
        <ScenarioCell delta-only :value="(row.cxDelta as number | null)"
          :delta="(row.cxDelta as number | null)" :decimals="CX_DECIMALS" big-threshold />
      </template>

      <template #cell-topAp="{ row }">
        <ScenarioCell :value="(row.topAp as number | null)" :delta="(row.topApDelta as number | null)"
          :decimals="AP_DECIMALS" emphasis />
      </template>

      <template #cell-avgWeighted="{ row }">
        <ScenarioCell :value="(row.avgWeighted as number | null)" :delta="(row.avgWeightedDelta as number | null)"
          :decimals="AP_DECIMALS" emphasis />
      </template>

      <template #cell-scores="{ row }">
        <span class="complexity-maps__scores">{{ formatCount(row.scores as number) }}</span>
      </template>

      <template #mobile-card="{ row }">
        <button type="button" class="complexity-maps__card"
          @click="emit('select', row.source as ComplexityDifficultyRow)">
          <GlowImage :src="row.coverUrl as string" alt="" :size="44"
            :fallback-src="(row.coverFallbackUrl as string | null)" />
          <div class="complexity-maps__card-body">
            <SongTitle class="complexity-maps__song-name" :name="(row.songName as string)"
              :sub-name="(row.songSubName as string | null)" />
            <span class="complexity-maps__song-meta">
              <CategoryBadge :category="(row.categoryCode as CategoryCode)" size="sm" />
              <DifficultyBadge :difficulty="(row.difficulty as string)" />
              <span class="complexity-maps__artist">{{ row.mapper }}</span>
            </span>
            <div class="complexity-maps__card-values">
              <span class="complexity-maps__card-label">CX</span>
              <ScenarioCell :value="(row.cxCurrent as number | null)" :decimals="CX_DECIMALS" emphasis />
              <span class="complexity-maps__card-label" aria-hidden="true">&rarr;</span>
              <ScenarioCell :value="(row.cxScenario as number | null)" :delta="(row.cxDelta as number | null)"
                :decimals="CX_DECIMALS" emphasis big-threshold />
            </div>
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
}

.complexity-maps :deep(.data-table__row.complexity-maps__row--moved) {
  background: color-mix(in srgb, var(--bg-surface) 93%, var(--warning) 7%);
}

.complexity-maps :deep(.data-table__row.complexity-maps__row--moved:nth-child(even)) {
  background: color-mix(in srgb, var(--bg-elevated) 93%, var(--warning) 7%);
}

.complexity-maps__song {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.complexity-maps__song-name {
  color: var(--text-primary);
  font-size: var(--text-body);
  font-weight: 500;
}

.complexity-maps__song-meta {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  min-width: 0;
}

.complexity-maps__artist,
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

.complexity-maps__card {
  display: flex;
  align-items: flex-start;
  gap: var(--space-md);
  width: 100%;
  padding: var(--space-md);
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  text-align: left;
  cursor: pointer;
}

.complexity-maps__card-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  min-width: 0;
}

.complexity-maps__card-values {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.complexity-maps__card-label {
  color: var(--text-tertiary);
  font-size: var(--text-caption);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
</style>
