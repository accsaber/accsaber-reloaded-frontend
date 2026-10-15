<script setup lang="ts">
import { formatCount } from '@/utils/formatters'
import DataTable from '@/components/common/DataTable.vue'
import ItemHoldersTooltip from '@/views/stats/ItemHoldersTooltip.vue'
import UserChip from '@/components/domain/UserChip.vue'
import type { ItemResponse } from '@/types/api/items'
import type { TableColumn, UserRefDisplay } from '@/types/display'
import { rarityClass } from '@/utils/items'
import { getRankClass } from '@/utils/ranking'
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import ItemStatsItemCell from './ItemStatsItemCell.vue'
import ItemStatsModifiers from './ItemStatsModifiers.vue'
import { fmtEssence, fmtPercentPoint } from './statsFormat'
import { playerRoute, type StatsRow } from './useStatsBoard'

const props = defineProps<{
  columns: TableColumn[]
  rows: StatsRow[]
  loading: boolean
  board: string
}>()

const router = useRouter()

const isScarcity = computed(() => props.board === 'rarest-items')
const hasOwner = computed(() => props.board === 'rarest-unboxed' || props.board === 'first-edition-holders')
const isItemBoard = computed(() => isScarcity.value || hasOwner.value)
const rowTo = computed(() => (isScarcity.value ? undefined : playerRoute))

function pushRow(row: StatsRow) {
  const target = rowTo.value?.(row)
  if (target) router.push(target)
}

function itemOf(row: StatsRow): ItemResponse | null {
  return (row.item as ItemResponse | null | undefined) ?? null
}

const PRIMARY_STAT: Record<string, { key: string; fmt: (v: number) => string; cls: string }> = {
  'most-items': { key: 'itemCount', fmt: formatCount, cls: 'stat-accent' },
  'most-crates-opened': { key: 'crateCount', fmt: formatCount, cls: 'stat-accent' },
  'most-valuable-inventory': { key: 'totalValue', fmt: fmtEssence, cls: 'stat-essence' },
  'first-editions': { key: 'firstEditionCount', fmt: formatCount, cls: 'stat-accent' },
  'most-complete-collection': { key: 'completionPercent', fmt: fmtPercentPoint, cls: 'stat-accent' },
  'biggest-traders': { key: 'tradeCount', fmt: formatCount, cls: 'stat-accent' },
}

const primaryStat = computed(() => PRIMARY_STAT[props.board])
</script>

<template>
  <DataTable :columns="columns" :rows="rows" :loading="loading" :loading-rows="10" :row-clickable="!isScarcity"
    :row-to="rowTo" row-key="rank" empty-message="No records found">

    <template #cell-rank="{ value }">
      <span class="rank-cell" :class="getRankClass(value as number)">#{{ value }}</span>
    </template>

    <template #cell-player="{ row }">
      <UserChip :user="(row.player as UserRefDisplay)" tooltip />
    </template>

    <template #cell-owner="{ row }">
      <UserChip :user="(row.player as UserRefDisplay)" tooltip />
    </template>

    <template #cell-item="{ row }">
      <div class="item-cell">
        <ItemStatsItemCell :item="itemOf(row)" :serial="(row.serialNumber as number | null | undefined)" />
        <ItemHoldersTooltip v-if="isScarcity" class="item-cell__owners" :item-id="(row.itemId as string)"
          :item-name="itemOf(row)?.name ?? ''" :owner-count="(row.ownerCount as number)" />
      </div>
    </template>

    <template #cell-modifiers="{ row }">
      <ItemStatsModifiers :modifiers="row.modifiers" :unusual-effect="(row.unusualEffect as string | null)" />
    </template>

    <template #cell-itemCount="{ value }"><span class="stat-accent">{{ formatCount(value as number | null) }}</span></template>
    <template #cell-crateCount="{ value }"><span class="stat-accent">{{ formatCount(value as number | null) }}</span></template>
    <template #cell-firstEditionCount="{ value }"><span class="stat-accent">{{ formatCount(value as number | null) }}</span></template>
    <template #cell-tradeCount="{ value }"><span class="stat-accent">{{ formatCount(value as number | null) }}</span></template>
    <template #cell-itemsTraded="{ value }">{{ formatCount(value as number | null) }}</template>
    <template #cell-ownedCount="{ value }"><span class="stat-accent">{{ formatCount(value as number | null) }}</span></template>
    <template #cell-catalogTotal="{ value }">{{ formatCount(value as number | null) }}</template>
    <template #cell-completionPercent="{ value }"><span class="stat-accent">{{ fmtPercentPoint(value) }}</span></template>
    <template #cell-ownerCount="{ value }"><span class="stat-accent">{{ formatCount(value as number | null) }}</span></template>
    <template #cell-instanceCount="{ value }">{{ formatCount(value as number | null) }}</template>
    <template #cell-itemsValue="{ value }">{{ fmtEssence(value) }}</template>
    <template #cell-essenceBalance="{ value }">{{ fmtEssence(value) }}</template>
    <template #cell-totalValue="{ value }"><span class="stat-essence">{{ fmtEssence(value) }}</span></template>

    <template #mobile-card="{ row }">
      <div v-if="isItemBoard" class="stats-card stats-card--item" :class="{ 'stats-card--static': isScarcity }"
        @click="pushRow(row)">
        <div class="stats-card__head">
          <span class="stats-card__rank rank-cell" :class="getRankClass(row.rank as number)">#{{ row.rank }}</span>
          <ItemStatsItemCell :item="itemOf(row)" :serial="(row.serialNumber as number | null | undefined)" small />
          <span v-if="hasOwner && itemOf(row)" class="stats-card__badge" :class="rarityClass(itemOf(row)!.rarity)">
            {{ itemOf(row)!.rarity }}
          </span>
          <ItemHoldersTooltip v-if="isScarcity" :item-id="(row.itemId as string)"
            :item-name="itemOf(row)?.name ?? ''" :owner-count="(row.ownerCount as number)" />
        </div>

        <div class="stats-card__details">
          <div v-if="hasOwner" class="stats-card__detail">
            <span class="stats-card__label field-label">{{ board === 'first-edition-holders' ? 'Holder' : 'Owner' }}</span>
            <UserChip :user="(row.player as UserRefDisplay)" size="sm" tooltip />
          </div>
          <div v-if="board === 'rarest-unboxed'" class="stats-card__detail stats-card__detail--stacked">
            <span class="stats-card__label field-label">Modifiers</span>
            <ItemStatsModifiers :modifiers="row.modifiers" :unusual-effect="(row.unusualEffect as string | null)" />
          </div>
          <div v-if="isScarcity" class="stats-card__counts">
            <span class="stats-card__count">
              <span class="stats-card__label field-label">Owners</span>
              <span class="stat-accent">{{ formatCount(row.ownerCount as number) }}</span>
            </span>
            <span class="stats-card__count">
              <span class="stats-card__label field-label">Copies</span>
              <span>{{ formatCount(row.instanceCount as number) }}</span>
            </span>
          </div>
        </div>
      </div>

      <div v-else class="stats-card" @click="pushRow(row)">
        <span class="stats-card__rank rank-cell" :class="getRankClass(row.rank as number)">#{{ row.rank }}</span>

        <UserChip :user="(row.player as UserRefDisplay)" size="sm" tooltip class="stats-card__player" />

        <span v-if="primaryStat" class="stats-card__stat" :class="primaryStat.cls">
          {{ primaryStat.fmt(row[primaryStat.key] as number) }}
        </span>
      </div>
    </template>
  </DataTable>
</template>

<style scoped>
.rank-cell {
  font-family: var(--font-mono);
  font-weight: 500;
  color: var(--text-secondary);
}

.rank-cell.rank--gold { color: var(--tier-gold); font-weight: 700; }
.rank-cell.rank--silver { color: var(--tier-silver); font-weight: 700; }
.rank-cell.rank--bronze { color: var(--tier-bronze); font-weight: 700; }

.stat-accent {
  color: var(--page-accent);
  font-weight: 600;
}

.stat-essence {
  color: var(--tier-gold);
  font-weight: 600;
}

.item-cell {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  min-width: 0;
}

.item-cell__owners {
  flex-shrink: 0;
  margin-left: var(--space-xs);
}

.stats-card {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  cursor: pointer;
  min-height: 48px;
  transition: border-color 120ms ease;
}

.stats-card:hover {
  border-color: var(--page-accent);
}

.stats-card--static {
  cursor: default;
}

.stats-card--static:hover {
  border-color: var(--bg-overlay);
}

.stats-card__rank {
  width: 32px;
  text-align: right;
  flex-shrink: 0;
}

.stats-card__player {
  flex: 1;
}

.stats-card__stat {
  font-family: var(--font-mono);
  flex-shrink: 0;
  margin-left: auto;
}

.stats-card--item {
  flex-direction: column;
  align-items: stretch;
  gap: var(--space-sm);
}

.stats-card__head {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  min-width: 0;
}

.stats-card__badge {
  flex-shrink: 0;
  color: var(--rarity-color, var(--text-primary));
  font-size: var(--text-caption);
  font-weight: 600;
  text-transform: capitalize;
}

.stats-card__details {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  padding-top: var(--space-sm);
  border-top: 1px solid var(--bg-overlay);
}

.stats-card__detail {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
  min-width: 0;
}

.stats-card__detail--stacked {
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-xs);
}

.stats-card__label {
  flex-shrink: 0;
}

.stats-card__counts {
  display: flex;
  gap: var(--space-xl);
}

.stats-card__count {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-family: var(--font-mono);
  font-weight: 600;
}
</style>
