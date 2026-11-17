<script setup lang="ts">
import DataTable from '@/components/common/DataTable.vue'
import PaginationControls from '@/components/common/PaginationControls.vue'
import { useMediaQuery } from '@/composables/useMediaQuery'
import ClanIcon from '@/components/domain/ClanIcon.vue'
import ClanName from '@/components/domain/ClanName.vue'
import ClanTag from '@/components/domain/ClanTag.vue'
import type { PublicClanResponse } from '@/types/api/clans'
import type { SortState, TableColumn } from '@/types/display'
import { getRankClass } from '@/utils/ranking'
import { tableCardQuery } from '@/utils/tableLayout'
import ClanPacifistBadge from './ClanPacifistBadge.vue'

export interface StandingsRow extends Record<string, unknown> {
  rank: number
  clan: PublicClanResponse
  standing: string
  pacifist?: boolean
  meta?: string
}

const props = defineProps<{
  columns: TableColumn[]
  rows: StandingsRow[]
  loading: boolean
  top: boolean
  page: number
  totalPages: number
  pageSize: number
  refreshing?: boolean
  emptyMessage: string
  sortState?: SortState
}>()

const emit = defineEmits<{ page: [page: number]; sort: [key: string] }>()

const mobile = useMediaQuery(() => tableCardQuery(props.columns))

function tier(row: Record<string, unknown>): 'first' | 'top' | null {
  const rank = (row as StandingsRow).rank
  if (!props.top || rank > 3) return null
  return rank === 1 ? 'first' : 'top'
}

function rowHeight(index: number): number {
  const base = mobile.value ? 72 : 48
  if (!props.top || index > 2) return base
  return index === 0 && !mobile.value ? 112 : 88
}

function rowClass(row: Record<string, unknown>) {
  const t = tier(row)
  return t ? `standings-row--${t}` : undefined
}

function iconSize(row: Record<string, unknown>): number {
  const t = tier(row)
  if (!t) return 32
  return t === 'first' && !mobile.value ? 72 : 56
}

function rowTo(row: Record<string, unknown>) {
  return { name: 'clan-detail', params: { slugOrId: (row.clan as PublicClanResponse).slug } }
}

function asRow(row: Record<string, unknown>): StandingsRow {
  return row as StandingsRow
}
</script>

<template>
  <div class="standings">
    <div v-if="totalPages > 1 || loading" class="standings__top">
      <PaginationControls v-if="totalPages > 1" compact :page="page" :total-pages="totalPages"
        @update:page="emit('page', $event)" />
    </div>

    <DataTable
      :columns="columns"
      :rows="rows"
      :sort-state="sortState"
      :loading="loading"
      :refreshing="refreshing"
      :loading-rows="pageSize"
      :row-height="rowHeight"
      :row-class="rowClass"
      :row-to="rowTo"
      row-key="rank"
      :empty-message="emptyMessage"
      @sort="emit('sort', $event)"
    >
      <template #cell-rank="{ value }">
        <span class="rank" :class="getRankClass(value as number)">#{{ value }}</span>
      </template>

      <template #cell-clan="{ row }">
        <span class="standings__identity">
          <ClanIcon :clan="asRow(row).clan" :size="iconSize(row)" />
          <ClanTag :clan="asRow(row).clan" :size="tier(row) === 'first' ? 'lg' : 'md'" effects />
          <ClanName class="standings__name" :clan="asRow(row).clan" />
          <ClanPacifistBadge v-if="asRow(row).pacifist" />
        </span>
      </template>

      <template #cell-standing="{ value }">
        <span class="standings__standing">{{ value }}</span>
      </template>

      <template v-for="(_, name) in $slots" #[name]="slotProps">
        <slot :name="name" v-bind="slotProps" />
      </template>

      <template #mobile-card="{ row }">
        <RouterLink :to="rowTo(row)" class="standings-card" :class="rowClass(row)">
          <span class="rank standings-card__rank" :class="getRankClass(asRow(row).rank)">#{{ asRow(row).rank }}</span>
          <span class="standings-card__identity">
            <ClanIcon :clan="asRow(row).clan" :size="iconSize(row)" />
            <span class="standings-card__title">
              <ClanTag :clan="asRow(row).clan" size="md" effects />
              <ClanName class="standings__name" :clan="asRow(row).clan" />
              <ClanPacifistBadge v-if="asRow(row).pacifist" />
            </span>
            <span v-if="asRow(row).meta" class="caption standings-card__meta">{{ asRow(row).meta }}</span>
          </span>
          <span class="standings__standing">{{ asRow(row).standing }}</span>
        </RouterLink>
      </template>
    </DataTable>

    <div v-if="totalPages > 1 || loading" class="standings__pages">
      <PaginationControls v-if="totalPages > 1" :page="page" :total-pages="totalPages"
        @update:page="emit('page', $event)" />
    </div>
  </div>
</template>

<style scoped>
.standings {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.standings__top {
  --control-h: 28px;
  position: absolute;
  top: 3px;
  right: 0;
  z-index: 2;
  min-height: var(--control-h);
}

.standings__identity {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  min-width: 0;
  font-size: var(--text-card-title);
}

.standings__name {
  font-weight: 600;
  color: var(--text-primary);
}

.standings__standing {
  font-weight: 600;
  color: var(--page-accent, var(--accent));
}

.standings__pages {
  min-height: var(--control-h);
}

:deep(.standings-row--top .data-table__td) {
  font-size: var(--text-card-title);
}

:deep(.standings-row--top) :is(.standings__identity, .standings__standing),
:deep(.standings-row--first .data-table__td) {
  font-size: var(--text-section-heading);
}

:deep(.standings-row--first) :is(.standings__identity, .standings__standing) {
  font-size: var(--text-stat-lg);
}

:deep(:is(.standings-row--top, .standings-row--first)) .standings__identity {
  gap: var(--space-md);
}

@media (max-width: 767px) {
  .standings__top {
    position: static;
    display: flex;
    justify-content: flex-end;
    margin-bottom: calc(-1 * var(--space-sm));
  }
}

.standings-card {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  min-height: 72px;
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-surface);
  border-radius: var(--radius-card);
  color: inherit;
  text-decoration: none;
}

.standings-card:is(.standings-row--top, .standings-row--first) {
  min-height: 88px;
}

.standings-card__rank {
  min-width: 36px;
}

.standings-card__identity {
  display: grid;
  flex: 1;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 0 var(--space-sm);
  min-width: 0;
}

.standings-card__identity > :first-child {
  grid-row: span 2;
}

.standings-card__title {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0 var(--space-sm);
  min-width: 0;
}

.standings-card__meta {
  font-family: var(--font-mono);
  white-space: nowrap;
}

.standings-card:is(.standings-row--top, .standings-row--first) .standings__standing {
  font-size: var(--text-section-heading);
}
</style>
