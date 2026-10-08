<script setup lang="ts">
import Breadcrumbs, { type Crumb } from '@/components/common/Breadcrumbs.vue'
import DataTable from '@/components/common/DataTable.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import PaginationControls from '@/components/common/PaginationControls.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import ClanIcon from '@/components/domain/ClanIcon.vue'
import ClanName from '@/components/domain/ClanName.vue'
import ClanTag from '@/components/domain/ClanTag.vue'
import { usePageableRoute } from '@/composables/usePageableRoute'
import { usePageMeta } from '@/composables/usePageMeta'
import { useSharedNow } from '@/composables/useSharedNow'
import type { ClanSeasonResponse, ClanStandingResponse, PublicClanResponse } from '@/types/api/clans'
import type { TableColumn } from '@/types/display'
import type { Page } from '@/types/pagination'
import { formatCountdown, formatSignedStanding, formatStanding, isSeasonRunning } from '@/utils/clans'
import { formatFullDate } from '@/utils/formatters'
import { isUuid } from '@/utils/mapRoute'
import { getRankClass } from '@/utils/ranking'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ClanPodium, { type PodiumEntry } from './clans/ClanPodium.vue'

const PAGE_SIZE = 25

const route = useRoute()
const router = useRouter()
const now = useSharedNow()

const { currentPage, paginationParams, setPage } = usePageableRoute({
  defaultSort: 'rank',
  defaultOrder: 'asc',
  defaultSize: PAGE_SIZE,
  secondarySort: null,
})

const slugOrId = computed(() => String(route.params.slugOrId ?? ''))
const season = ref<ClanSeasonResponse | null>(null)
const seasonLoading = ref(true)
const error = ref<string | null>(null)
const pageData = ref<Page<ClanStandingResponse> | null>(null)
const loading = ref(true)

usePageMeta({
  title: computed(() => (season.value ? `${season.value.name} | Clan Seasons | AccSaber` : 'Clan Season | AccSaber')),
  description: 'Clan standings for the season.',
})

const running = computed(() => !!season.value && isSeasonRunning(season.value, now.value))
const breadcrumbs = computed<Crumb[]>(() => [
  { label: 'Clans', to: { name: 'clans' } },
  { label: 'Seasons', to: { name: 'clan-seasons' } },
  { label: season.value?.name ?? 'Season' },
])
const statusLine = computed(() => {
  const s = season.value
  if (!s) return ''
  if (running.value) return `Running, ends in ${formatCountdown(new Date(s.endsAt).getTime() - now.value)}`
  if (s.closedAt) return `Closed ${formatFullDate(s.closedAt)}`
  return `Starts ${formatFullDate(s.startsAt)}`
})

const columns: TableColumn[] = [
  { key: 'rank', label: 'Rank', align: 'right', mono: true, width: '80px' },
  { key: 'clan', label: 'Clan', align: 'left' },
  { key: 'base', label: 'Base', align: 'right', mono: true, width: '120px' },
  { key: 'earned', label: 'Earned', align: 'right', mono: true, width: '120px' },
  { key: 'standing', label: 'Standing', align: 'right', mono: true, width: '140px' },
]

const allRows = computed(() =>
  (pageData.value?.content ?? []).map((entry) => ({
    rank: entry.rank,
    clan: entry.clan,
    base: formatStanding(entry.baseStanding),
    earned: formatSignedStanding(entry.earned),
    standing: formatStanding(entry.standing),
  })),
)
const podiumEligible = computed(() => currentPage.value === 1)
const podium = computed<PodiumEntry[]>(() =>
  podiumEligible.value
    ? allRows.value.slice(0, 3).map((r) => ({ rank: r.rank, clan: r.clan, value: r.standing }))
    : [],
)
const rows = computed(() => (podiumEligible.value ? allRows.value.slice(3) : allRows.value))
const showTable = computed(() => loading.value || rows.value.length > 0 || podium.value.length === 0)
const totalPages = computed(() => pageData.value?.totalPages ?? 0)

function rowTo(row: Record<string, unknown>) {
  return { name: 'clan-detail', params: { slugOrId: (row.clan as PublicClanResponse).slug } }
}

async function loadSeason(key: string) {
  seasonLoading.value = true
  error.value = null
  try {
    const { getClanSeason } = await import('@/api/clans')
    const fetched = await getClanSeason(key)
    season.value = fetched
    if (isUuid(key) && fetched.slug) {
      await router.replace({ params: { slugOrId: fetched.slug }, query: route.query })
    }
  } catch {
    season.value = null
    error.value = 'Season not found.'
  } finally {
    seasonLoading.value = false
  }
}

async function fetchStandings() {
  loading.value = true
  try {
    const { getClanSeasonStandings } = await import('@/api/clans')
    pageData.value = await getClanSeasonStandings(slugOrId.value, {
      page: paginationParams.value.page,
      size: PAGE_SIZE,
    })
  } catch {
    pageData.value = null
  } finally {
    loading.value = false
  }
}

watch(
  slugOrId,
  (key, previous) => {
    if (season.value && (key === season.value.slug || key === season.value.id) && previous) return
    if (key) loadSeason(key)
  },
  { immediate: true },
)
watch(() => [slugOrId.value, route.query.page], fetchStandings, { immediate: true })
</script>

<template>
  <div class="season">
    <Breadcrumbs :crumbs="breadcrumbs" />
    <header class="season__header">
      <template v-if="seasonLoading">
        <SkeletonLoader variant="text" :lines="2" width="320px" />
      </template>
      <template v-else-if="season">
        <h1 class="season__title">{{ season.name }}</h1>
        <p class="season__status" :class="{ 'season__status--running': running }">{{ statusLine }}</p>
        <p class="season__dates">{{ formatFullDate(season.startsAt) }} to {{ formatFullDate(season.endsAt) }}</p>
      </template>
    </header>

    <EmptyState v-if="error" :message="error" />

    <template v-else>
      <ClanPodium v-if="podiumEligible && (loading || podium.length)" :entries="podium" :loading="loading" />

      <PaginationControls v-if="totalPages > 1" :page="currentPage" :total-pages="totalPages" @update:page="setPage" />

      <DataTable
        v-if="showTable"
        :columns="columns"
        :rows="rows"
        :loading="loading"
        :loading-rows="8"
        :row-to="rowTo"
        row-key="rank"
        empty-message="No clans placed this season"
      >
        <template #cell-rank="{ value }">
          <span class="rank-cell" :class="getRankClass(value as number)">#{{ value }}</span>
        </template>
        <template #cell-clan="{ row }">
          <span class="season__identity">
            <ClanIcon :clan="(row.clan as PublicClanResponse)" :size="32" />
          <ClanTag :clan="(row.clan as PublicClanResponse)" size="md" effects />
            <ClanName class="season__name" :clan="(row.clan as PublicClanResponse)" />
          </span>
        </template>
        <template #cell-standing="{ value }">
          <span class="season__standing">{{ value }}</span>
        </template>
        <template #mobile-card="{ row }">
          <RouterLink :to="rowTo(row)" class="season-row">
            <span class="rank-cell season-row__rank" :class="getRankClass(row.rank as number)">#{{ row.rank }}</span>
            <span class="season__identity season-row__identity">
              <ClanIcon :clan="(row.clan as PublicClanResponse)" :size="32" />
          <ClanTag :clan="(row.clan as PublicClanResponse)" size="md" effects />
              <ClanName class="season__name" :clan="(row.clan as PublicClanResponse)" />
            </span>
            <span class="season__standing">{{ row.standing }}</span>
          </RouterLink>
        </template>
      </DataTable>

      <PaginationControls v-if="totalPages > 1" :page="currentPage" :total-pages="totalPages" @update:page="setPage" />
    </template>
  </div>
</template>

<style scoped>
.season {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  width: 100%;
  max-width: 1080px;
  margin: 0 auto;
}

.season__header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-xs);
  text-align: center;
  padding: var(--space-lg) 0 var(--space-lg);
}

.season__title {
  margin: 0;
  font-size: var(--text-page-title);
  font-weight: 700;
  color: var(--text-primary);
}

.season__status {
  margin: 0;
  font-family: var(--font-mono);
  font-size: var(--text-body);
  color: var(--text-secondary);
}

.season__status--running {
  color: var(--page-accent, var(--accent));
}

.season__dates {
  margin: 0;
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--text-tertiary);
}

.season__identity {
  font-size: var(--text-card-title);
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  min-width: 0;
}

.season__name {
  font-weight: 600;
  color: var(--text-primary);
}

.season__standing {
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

.season-row {
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

.season-row__rank {
  min-width: 36px;
}

.season-row__identity {
  flex: 1;
}
</style>
