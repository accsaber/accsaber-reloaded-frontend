<script setup lang="ts">
import BaseSelect from '@/components/common/BaseSelect.vue'
import DataTable from '@/components/common/DataTable.vue'
import PaginationControls from '@/components/common/PaginationControls.vue'
import { usePageableRoute } from '@/composables/usePageableRoute'
import type { ClanResponse, ClanSeasonResponse, ClanStandingEventResponse, ClanStandingResponse } from '@/types/api/clans'
import type { TableColumn } from '@/types/display'
import type { Page } from '@/types/pagination'
import { CLAN_STANDING_SOURCE_LABEL, formatSignedStanding, formatStanding, isSeasonRunning } from '@/utils/clans'
import { formatRelativeDate } from '@/utils/formatters'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter, type LocationQueryRaw } from 'vue-router'

const props = defineProps<{ clan: ClanResponse }>()

const route = useRoute()
const router = useRouter()

const { currentPage, paginationParams, setPage } = usePageableRoute({
  defaultSort: 'createdAt',
  defaultOrder: 'desc',
  defaultSize: 25,
  secondarySort: null,
})

const seasons = ref<ClanSeasonResponse[] | null>(null)
const standing = ref<ClanStandingResponse | null>(null)
const events = ref<Page<ClanStandingEventResponse> | null>(null)
const eventsLoading = ref(true)

const runningSlug = computed(() => seasons.value?.find((s) => isSeasonRunning(s))?.slug ?? '')
const selectedSeason = computed(() => {
  const requested = route.query.season
  if (typeof requested === 'string' && requested) return requested
  return runningSlug.value || seasons.value?.[0]?.slug || ''
})
const pastSeason = computed(() => (selectedSeason.value !== runningSlug.value ? selectedSeason.value : ''))
const closedSeason = computed(() => seasons.value?.find((s) => s.slug === pastSeason.value && s.closedAt)?.slug ?? '')

const seasonOptions = computed(() =>
  (seasons.value ?? []).map((s) => ({ value: s.slug, label: s.slug === runningSlug.value ? `${s.name} (running)` : s.name })),
)

const columns: TableColumn[] = [
  { key: 'source', label: 'Source', align: 'left' },
  { key: 'amount', label: 'Standing', align: 'right', mono: true, width: '140px' },
  { key: 'createdAt', label: 'When', align: 'right', mono: true, width: '120px' },
]

const rows = computed(() =>
  (events.value?.content ?? []).map((event) => ({
    id: event.id,
    source: CLAN_STANDING_SOURCE_LABEL[event.source],
    amount: formatSignedStanding(event.amount),
    positive: event.amount >= 0,
    createdAt: formatRelativeDate(event.createdAt),
  })),
)
const totalPages = computed(() => events.value?.totalPages ?? 0)

function setSeason(slug: string) {
  const query: LocationQueryRaw = { ...route.query, season: slug }
  delete query.page
  router.replace({ query })
}

async function fetchStanding(season: string) {
  standing.value = null
  if (!season) return
  try {
    const { getClanStanding } = await import('@/api/clans')
    standing.value = await getClanStanding(props.clan.clan.id, { season })
  } catch {
    standing.value = null
  }
}

async function fetchEvents() {
  eventsLoading.value = true
  try {
    const { getClanStandingEvents } = await import('@/api/clans')
    events.value = await getClanStandingEvents(props.clan.clan.id, {
      page: paginationParams.value.page,
      size: 25,
      season: pastSeason.value || undefined,
    })
  } catch {
    events.value = null
  } finally {
    eventsLoading.value = false
  }
}

async function fetchSeasons() {
  try {
    const { getClanSeasons } = await import('@/api/clans')
    seasons.value = (await getClanSeasons({ page: 0, size: 50 })).content
  } catch {
    seasons.value = []
  }
}

const seasonKey = computed(() => (seasons.value ? pastSeason.value : null))

fetchSeasons()
watch(closedSeason, fetchStanding)
watch(() => [seasonKey.value, route.query.page], () => { if (seasonKey.value !== null) fetchEvents() })
</script>

<template>
  <section class="standing-tab">
    <div class="standing-tab__controls">
      <BaseSelect
        v-if="seasonOptions.length > 1"
        :model-value="selectedSeason"
        :options="seasonOptions"
        placeholder="Season"
        @update:model-value="setSeason"
      />
    </div>

    <p v-if="standing" class="standing-tab__past">
      Finished #{{ standing.rank }} with {{ formatStanding(standing.standing) }} Standing,
      {{ formatStanding(standing.baseStanding) }} base and {{ formatSignedStanding(standing.earned) }} earned.
    </p>

    <DataTable
      :columns="columns"
      :rows="rows"
      :loading="eventsLoading"
      :loading-rows="6"
      row-key="id"
      empty-message="No Standing moved yet this season"
    >
      <template #cell-amount="{ value, row }">
        <span class="standing-tab__amount" :class="{ 'standing-tab__amount--down': !row.positive }">{{ value }}</span>
      </template>
    </DataTable>

    <PaginationControls v-if="totalPages > 1" :page="currentPage" :total-pages="totalPages" @update:page="setPage" />
  </section>
</template>

<style scoped>
.standing-tab {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.standing-tab__controls {
  display: flex;
  justify-content: flex-end;
  min-height: 0;
}

.standing-tab__past {
  margin: 0;
  color: var(--text-secondary);
}

.standing-tab__amount {
  font-weight: 600;
  color: var(--success);
}

.standing-tab__amount--down {
  color: var(--error);
}
</style>
