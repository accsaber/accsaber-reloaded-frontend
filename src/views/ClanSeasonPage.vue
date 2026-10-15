<script setup lang="ts">
import Breadcrumbs, { type Crumb } from '@/components/common/Breadcrumbs.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import { usePageableRoute } from '@/composables/usePageableRoute'
import { usePageMeta } from '@/composables/usePageMeta'
import { useNow } from '@/composables/useNow'
import type { ClanSeasonResponse, ClanStandingResponse } from '@/types/api/clans'
import type { TableColumn } from '@/types/display'
import type { Page } from '@/types/pagination'
import { formatSignedStanding, formatStanding, isSeasonRunning } from '@/utils/clans'
import { formatDuration, formatFullDate } from '@/utils/formatters'
import { isUuid } from '@/utils/mapRoute'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ClanStandingsTable, { type StandingsRow } from './clans/ClanStandingsTable.vue'

const PAGE_SIZE = 25

const route = useRoute()
const router = useRouter()
const now = useNow()

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
  if (running.value) return `Running, ends in ${formatDuration(new Date(s.endsAt).getTime() - now.value, { zero: 'now' })}`
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

const rows = computed<StandingsRow[]>(() =>
  (pageData.value?.content ?? []).map((entry) => ({
    rank: entry.rank,
    clan: entry.clan,
    base: formatStanding(entry.baseStanding),
    earned: formatSignedStanding(entry.earned),
    standing: formatStanding(entry.standing),
  })),
)
const totalPages = computed(() => pageData.value?.totalPages ?? 0)

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

    <ClanStandingsTable
      v-else
      :columns="columns"
      :rows="rows"
      :loading="loading"
      :podium="currentPage === 1"
      :page="currentPage"
      :total-pages="totalPages"
      empty-message="No clans placed this season"
      @page="setPage"
    />
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

</style>
