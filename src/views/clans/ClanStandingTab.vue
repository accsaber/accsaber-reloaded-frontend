<script setup lang="ts">
import BaseSelect from '@/components/common/BaseSelect.vue'
import DataTable from '@/components/common/DataTable.vue'
import PaginationControls from '@/components/common/PaginationControls.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
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

const seasons = ref<ClanSeasonResponse[]>([])
const standing = ref<ClanStandingResponse | null>(null)
const standingLoading = ref(true)
const events = ref<Page<ClanStandingEventResponse> | null>(null)
const eventsLoading = ref(true)

const selectedSeason = computed(() => {
  const requested = route.query.season
  if (typeof requested === 'string' && requested) return requested
  return seasons.value.find((s) => isSeasonRunning(s))?.slug ?? seasons.value[0]?.slug ?? ''
})

const seasonOptions = computed(() =>
  seasons.value.map((s) => ({ value: s.slug, label: isSeasonRunning(s) ? `${s.name} (running)` : s.name })),
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

async function fetchSeasons() {
  try {
    const { getClanSeasons } = await import('@/api/clans')
    seasons.value = (await getClanSeasons({ page: 0, size: 50 })).content
  } catch {
    seasons.value = []
  }
}

async function fetchStanding(season: string) {
  standingLoading.value = true
  try {
    const { getClanStanding } = await import('@/api/clans')
    standing.value = await getClanStanding(props.clan.clan.id, season ? { season } : undefined)
  } catch {
    standing.value = null
  } finally {
    standingLoading.value = false
  }
}

async function fetchEvents(season: string) {
  eventsLoading.value = true
  try {
    const { getClanStandingEvents } = await import('@/api/clans')
    events.value = await getClanStandingEvents(props.clan.clan.id, {
      page: paginationParams.value.page,
      size: 25,
      season: season || undefined,
    })
  } catch {
    events.value = null
  } finally {
    eventsLoading.value = false
  }
}

fetchSeasons()
watch(selectedSeason, (season) => { fetchStanding(season) }, { immediate: true })
watch(
  () => [selectedSeason.value, route.query.page],
  () => { fetchEvents(selectedSeason.value) },
  { immediate: true },
)
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

    <SkeletonLoader v-if="standingLoading" variant="stat-block" height="120px" />
    <dl v-else-if="standing" class="standing-tab__summary">
      <div class="standing-tab__stat standing-tab__stat--total">
        <dt>Standing</dt>
        <dd>{{ formatStanding(standing.standing) }}</dd>
      </div>
      <div class="standing-tab__stat">
        <dt>Rank</dt>
        <dd>#{{ standing.rank }}</dd>
      </div>
      <div class="standing-tab__stat">
        <dt>Base</dt>
        <dd>{{ formatStanding(standing.baseStanding) }}</dd>
      </div>
      <div class="standing-tab__stat">
        <dt>Earned</dt>
        <dd>{{ formatSignedStanding(standing.earned) }}</dd>
      </div>
    </dl>

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

.standing-tab__summary {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  gap: var(--space-md);
  margin: 0;
  padding: var(--space-lg);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  background: var(--bg-surface);
}

.standing-tab__stat {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.standing-tab__stat dt {
  font-size: var(--text-caption);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-secondary);
}

.standing-tab__stat dd {
  margin: 0;
  font-family: var(--font-mono);
  font-size: var(--text-section-heading);
  font-weight: 600;
  line-height: 1;
  color: var(--text-primary);
}

.standing-tab__stat--total dd {
  font-size: calc(var(--text-page-title) * 1.5);
  color: var(--page-accent, var(--accent));
}

.standing-tab__amount {
  font-weight: 600;
  color: var(--success);
}

.standing-tab__amount--down {
  color: var(--error);
}

@media (max-width: 767px) {
  .standing-tab__summary {
    grid-template-columns: 1fr 1fr;
  }

  .standing-tab__stat--total {
    grid-column: 1 / -1;
  }
}
</style>
