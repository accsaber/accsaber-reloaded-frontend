<script setup lang="ts">
import Breadcrumbs, { type Crumb } from '@/components/common/Breadcrumbs.vue'
import DataTable from '@/components/common/DataTable.vue'
import PaginationControls from '@/components/common/PaginationControls.vue'
import { usePageableRoute } from '@/composables/usePageableRoute'
import { usePageMeta } from '@/composables/usePageMeta'
import { useSharedNow } from '@/composables/useSharedNow'
import type { ClanSeasonResponse } from '@/types/api/clans'
import type { TableColumn } from '@/types/display'
import type { Page } from '@/types/pagination'
import { formatCountdown, isSeasonRunning } from '@/utils/clans'
import { formatFullDate } from '@/utils/formatters'
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const now = useSharedNow()

const breadcrumbs: Crumb[] = [{ label: 'Clans', to: { name: 'clans' } }, { label: 'Seasons' }]

usePageMeta({
  title: 'Clan Seasons | AccSaber',
  description: 'Every clan season, running and closed.',
})

const { currentPage, paginationParams, setPage } = usePageableRoute({
  defaultSort: 'startsAt',
  defaultOrder: 'desc',
  defaultSize: 25,
  secondarySort: null,
})

const pageData = ref<Page<ClanSeasonResponse> | null>(null)
const loading = ref(true)

const columns: TableColumn[] = [
  { key: 'name', label: 'Season', align: 'left' },
  { key: 'startsAt', label: 'Starts', align: 'right', mono: true, width: '200px' },
  { key: 'endsAt', label: 'Ends', align: 'right', mono: true, width: '200px' },
  { key: 'status', label: '', align: 'right', width: '160px' },
]

const rows = computed(() => {
  const content = pageData.value?.content ?? []
  return [...content]
    .sort((a, b) => Number(isSeasonRunning(b, now.value)) - Number(isSeasonRunning(a, now.value)))
    .map((season) => {
      const running = isSeasonRunning(season, now.value)
      return {
        slug: season.slug,
        name: season.name,
        startsAt: formatFullDate(season.startsAt),
        endsAt: formatFullDate(season.endsAt),
        running,
        status: running
          ? `ends in ${formatCountdown(new Date(season.endsAt).getTime() - now.value)}`
          : season.closedAt ? 'Closed' : 'Upcoming',
      }
    })
})
const totalPages = computed(() => pageData.value?.totalPages ?? 0)

function rowTo(row: Record<string, unknown>) {
  return { name: 'clan-season', params: { slugOrId: row.slug as string } }
}

async function fetchSeasons() {
  loading.value = true
  try {
    const { getClanSeasons } = await import('@/api/clans')
    pageData.value = await getClanSeasons({ page: paginationParams.value.page, size: 25 })
  } catch {
    pageData.value = null
  } finally {
    loading.value = false
  }
}

watch(() => route.query.page, fetchSeasons, { immediate: true })
</script>

<template>
  <div class="seasons">
    <Breadcrumbs :crumbs="breadcrumbs" />
    <header class="seasons__header">
      <h1 class="seasons__title">Clan Seasons</h1>
    </header>

    <DataTable
      :columns="columns"
      :rows="rows"
      :loading="loading"
      :loading-rows="4"
      :row-to="rowTo"
      row-key="slug"
      empty-message="No seasons yet"
    >
      <template #cell-name="{ value, row }">
        <span class="seasons__name" :class="{ 'seasons__name--running': row.running }">{{ value }}</span>
      </template>
      <template #cell-status="{ value, row }">
        <span class="seasons__status" :class="{ 'seasons__status--running': row.running }">{{ value }}</span>
      </template>
      <template #mobile-card="{ row }">
        <RouterLink :to="rowTo(row)" class="season-card">
          <span class="seasons__name" :class="{ 'seasons__name--running': row.running }">{{ row.name }}</span>
          <span class="season-card__dates">{{ row.startsAt }} to {{ row.endsAt }}</span>
          <span class="seasons__status" :class="{ 'seasons__status--running': row.running }">{{ row.status }}</span>
        </RouterLink>
      </template>
    </DataTable>

    <PaginationControls v-if="totalPages > 1" :page="currentPage" :total-pages="totalPages" @update:page="setPage" />
  </div>
</template>

<style scoped>
.seasons {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  width: 100%;
  max-width: 1080px;
  margin: 0 auto;
}

.seasons__header {
  text-align: center;
  padding: var(--space-lg) 0 var(--space-lg);
}

.seasons__title {
  margin: 0;
  font-size: var(--text-page-title);
  font-weight: 700;
  color: var(--text-primary);
}

.seasons__name {
  font-weight: 600;
  color: var(--text-primary);
}

.seasons__name--running {
  color: var(--page-accent, var(--accent));
}

.seasons__status {
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

.seasons__status--running {
  color: var(--text-primary);
}

.season-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  color: inherit;
  text-decoration: none;
}

.season-card__dates {
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--text-secondary);
}
</style>
