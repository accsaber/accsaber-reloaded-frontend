<script setup lang="ts">
import DataTable from '@/components/common/DataTable.vue'
import PaginationControls from '@/components/common/PaginationControls.vue'
import SearchBox from '@/components/common/SearchBox.vue'
import ClanTag from '@/components/domain/ClanTag.vue'
import UserChip from '@/components/domain/UserChip.vue'
import { usePageableRoute } from '@/composables/usePageableRoute'
import { usePageMeta } from '@/composables/usePageMeta'
import type { ClanResponse, PublicClanResponse } from '@/types/api/clans'
import type { PlayerRef } from '@/types/api/common'
import type { TableColumn } from '@/types/display'
import type { Page } from '@/types/pagination'
import { formatStanding } from '@/utils/clans'
import { getRankClass } from '@/utils/ranking'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter, type LocationQueryRaw } from 'vue-router'
import ClanPodium, { type PodiumEntry } from './clans/ClanPodium.vue'

const PAGE_SIZE = 25

const route = useRoute()
const router = useRouter()

usePageMeta({
  title: 'Clans | AccSaber',
  description: 'Every AccSaber clan, ranked by Standing this season.',
})

const { currentPage, sortState, paginationParams, setPage, setSort } = usePageableRoute({
  defaultSort: 'standing',
  defaultOrder: 'desc',
  defaultSize: PAGE_SIZE,
  sortFieldMap: { name: 'name', level: 'level', members: 'members', standing: 'standing' },
  initialOrder: { name: 'asc' },
  secondarySort: null,
})

const searchQuery = ref((route.query.search as string) || '')
const pageData = ref<Page<ClanResponse> | null>(null)
const loading = ref(true)

const columns: TableColumn[] = [
  { key: 'rank', label: 'Rank', align: 'right', mono: true, width: '80px' },
  { key: 'clan', label: 'Clan', align: 'left' },
  { key: 'level', label: 'Level', sortable: true, align: 'right', mono: true, width: '100px' },
  { key: 'members', label: 'Members', sortable: true, align: 'right', mono: true, width: '120px' },
  { key: 'standing', label: 'Standing', sortable: true, align: 'right', mono: true, width: '140px' },
  { key: 'founder', label: 'Founder', align: 'left', width: '220px' },
]

const podiumEligible = computed(
  () =>
    currentPage.value === 1 &&
    sortState.value.key === 'standing' &&
    sortState.value.direction === 'desc' &&
    searchQuery.value.trim() === '',
)

interface ClanRow extends Record<string, unknown> {
  rank: number
  clan: PublicClanResponse
  level: number
  members: string
  standing: string
  founder: PlayerRef | null
}

const allRows = computed<ClanRow[]>(() => {
  const content = pageData.value?.content ?? []
  const offset = (currentPage.value - 1) * PAGE_SIZE
  return content.map((entry, i) => ({
    rank: offset + i + 1,
    clan: entry.clan,
    level: entry.level.level,
    members: `${entry.memberCount}/${entry.memberCap}`,
    standing: formatStanding(entry.standing),
    founder: entry.founder,
  }))
})

const podium = computed<PodiumEntry[]>(() =>
  podiumEligible.value
    ? allRows.value.slice(0, 3).map((r) => ({ rank: r.rank, clan: r.clan, value: r.standing }))
    : [],
)

const rows = computed<ClanRow[]>(() => (podiumEligible.value ? allRows.value.slice(3) : allRows.value))
const showTable = computed(() => loading.value || rows.value.length > 0 || podium.value.length === 0)
const totalPages = computed(() => pageData.value?.totalPages ?? 0)
const totalClans = computed(() => pageData.value?.totalElements ?? 0)

function rowTo(row: Record<string, unknown>) {
  return { name: 'clan-detail', params: { slugOrId: (row.clan as PublicClanResponse).slug } }
}

async function fetchClans() {
  loading.value = true
  try {
    const { getClans } = await import('@/api/clans')
    pageData.value = await getClans({
      ...paginationParams.value,
      search: searchQuery.value.trim() || undefined,
    })
  } catch {
    pageData.value = null
  } finally {
    loading.value = false
  }
}

watch(searchQuery, (value) => {
  const query: LocationQueryRaw = { ...route.query, search: value.trim() || undefined }
  delete query.page
  router.replace({ query })
})

watch(() => [route.query.page, route.query.sort, route.query.order, route.query.search], fetchClans, {
  immediate: true,
})
</script>

<template>
  <div class="clans">
    <header class="clans__header">
      <h1 class="clans__title">Clans</h1>
      <p v-if="totalClans > 0" class="clans__subtitle">{{ totalClans.toLocaleString() }} clans ranked</p>
    </header>

    <div class="clans__controls">
      <SearchBox v-model="searchQuery" placeholder="Search clans..." />
    </div>

    <ClanPodium v-if="podiumEligible && (loading || podium.length)" :entries="podium" :loading="loading" />

    <PaginationControls v-if="totalPages > 1" :page="currentPage" :total-pages="totalPages" @update:page="setPage" />

    <DataTable
      v-if="showTable"
      :columns="columns"
      :rows="rows"
      :sort-state="sortState"
      :loading="loading"
      :loading-rows="8"
      :row-to="rowTo"
      row-key="rank"
      empty-message="No clans found"
      @sort="setSort"
    >
      <template #cell-rank="{ value }">
        <span class="rank-cell" :class="getRankClass(value as number)">#{{ value }}</span>
      </template>

      <template #cell-clan="{ row }">
        <span class="clans__identity">
          <ClanTag :clan="(row.clan as PublicClanResponse)" size="lg" effects />
          <span class="clans__name">{{ (row.clan as PublicClanResponse).name }}</span>
        </span>
      </template>

      <template #cell-standing="{ value }">
        <span class="clans__standing">{{ value }}</span>
      </template>

      <template #cell-founder="{ row }">
        <UserChip v-if="row.founder" :user="(row.founder as PlayerRef)" size="sm" />
      </template>

      <template #mobile-card="{ row }">
        <RouterLink :to="rowTo(row)" class="clan-card">
          <span class="rank-cell clan-card__rank" :class="getRankClass(row.rank as number)">#{{ row.rank }}</span>
          <span class="clan-card__identity">
            <ClanTag :clan="(row.clan as PublicClanResponse)" size="lg" effects />
            <span class="clans__name">{{ (row.clan as PublicClanResponse).name }}</span>
            <span class="clan-card__meta">Lv {{ row.level }} · {{ row.members }}</span>
          </span>
          <span class="clans__standing">{{ row.standing }}</span>
        </RouterLink>
      </template>
    </DataTable>

    <PaginationControls v-if="totalPages > 1" :page="currentPage" :total-pages="totalPages" @update:page="setPage" />
  </div>
</template>

<style scoped>
.clans {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  width: 100%;
  max-width: 1080px;
  margin: 0 auto;
}

.clans__header {
  text-align: center;
  padding: var(--space-2xl) 0 var(--space-lg);
}

.clans__title {
  margin: 0;
  font-size: var(--text-page-title);
  font-weight: 700;
  color: var(--text-primary);
}

.clans__subtitle {
  margin: var(--space-xs) 0 0;
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  letter-spacing: 0.02em;
  color: var(--text-secondary);
}

.clans__controls {
  display: flex;
  justify-content: flex-end;
}

.clans__identity {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  min-width: 0;
}

.clans__name {
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.clans__standing {
  font-weight: 600;
  color: var(--page-accent, var(--accent));
}

.rank-cell {
  font-family: var(--font-mono);
  font-weight: 500;
  color: var(--text-secondary);
}

.rank-cell.rank--gold {
  color: var(--tier-gold);
  font-weight: 700;
}

.rank-cell.rank--silver {
  color: var(--tier-silver);
  font-weight: 700;
}

.rank-cell.rank--bronze {
  color: var(--tier-bronze);
  font-weight: 700;
}

.clan-card {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  min-height: 56px;
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  color: inherit;
  text-decoration: none;
}

.clan-card__rank {
  min-width: 36px;
}

.clan-card__identity {
  display: flex;
  flex: 1;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-xs) var(--space-sm);
  min-width: 0;
}

.clan-card__meta {
  width: 100%;
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--text-secondary);
}
</style>
