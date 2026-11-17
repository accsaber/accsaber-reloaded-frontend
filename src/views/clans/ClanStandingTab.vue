<script setup lang="ts">
import BaseSelect from '@/components/common/BaseSelect.vue'
import DataTable from '@/components/common/DataTable.vue'
import PaginationControls from '@/components/common/PaginationControls.vue'
import StatBlock from '@/components/common/StatBlock.vue'
import { usePageableRoute } from '@/composables/usePageableRoute'
import type { ClanResponse, ClanSeasonResponse, ClanStandingEventResponse, ClanStandingResponse } from '@/types/api/clans'
import type { TableColumn } from '@/types/display'
import type { Page } from '@/types/pagination'
import { CLAN_STANDING_SOURCE_LABEL, formatSignedStanding, formatStanding, isSeasonRunning } from '@/utils/clans'
import { formatRelativeDate } from '@/utils/formatters'
import { knownCount, rememberCount } from '@/utils/knownCount'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter, type LocationQueryRaw } from 'vue-router'
import './ledgerRow.css'

const props = defineProps<{
  clan: ClanResponse
  standing: ClanStandingResponse | null
  seasons: ClanSeasonResponse[] | null
}>()

const route = useRoute()
const router = useRouter()

const { currentPage, paginationParams, setPage } = usePageableRoute({
  defaultSort: 'createdAt',
  defaultOrder: 'desc',
  defaultSize: 25,
  secondarySort: null,
})

const pastStanding = ref<ClanStandingResponse | null>(null)
const events = ref<Page<ClanStandingEventResponse> | null>(null)
const eventsLoading = ref(true)
const FIRST_LOAD_ROWS = 10

const runningSlug = computed(() => props.seasons?.find((s) => isSeasonRunning(s))?.slug ?? '')
const selectedSeason = computed(() => {
  const requested = route.query.season
  if (typeof requested === 'string' && requested) return requested
  return runningSlug.value || props.seasons?.[0]?.slug || ''
})
const pastSeason = computed(() => (selectedSeason.value !== runningSlug.value ? selectedSeason.value : ''))
const closedSeason = computed(() => props.seasons?.find((s) => s.slug === pastSeason.value && s.closedAt)?.slug ?? '')

const shown = computed(() => (pastSeason.value ? pastStanding.value : props.standing))
const seasonOptions = computed(() =>
  (props.seasons ?? []).map((s) => ({ value: s.slug, label: s.slug === runningSlug.value ? `${s.name} (running)` : s.name })),
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
  pastStanding.value = null
  if (!season) return
  try {
    const { getClanStanding } = await import('@/api/clans')
    pastStanding.value = await getClanStanding(props.clan.clan.id, { season })
  } catch {
    pastStanding.value = null
  }
}

async function fetchEvents() {
  eventsLoading.value = true
  try {
    const { getClanStandingEvents } = await import('@/api/clans')
    const key = eventsKey.value
    events.value = await getClanStandingEvents(props.clan.clan.id, {
      page: paginationParams.value.page,
      size: 25,
      season: pastSeason.value || undefined,
    })
    rememberCount(key, events.value.content.length)
  } catch {
    events.value = null
  } finally {
    eventsLoading.value = false
  }
}

const seasonKey = computed(() => (props.seasons ? pastSeason.value : null))
const eventsKey = computed(() => `standing:${props.clan.clan.id}:${pastSeason.value}`)
const loadingRows = computed(() => knownCount(eventsKey.value, FIRST_LOAD_ROWS))

watch(closedSeason, fetchStanding, { immediate: true })
watch(() => [seasonKey.value, route.query.page], () => { if (seasonKey.value !== null) fetchEvents() }, { immediate: true })
</script>

<template>
  <section class="standing-tab">
    <div class="standing-tab__totals">
      <StatBlock v-if="pastSeason" label="Finished" :value="shown ? `#${shown.rank}` : ''" />
      <StatBlock v-if="pastSeason" label="Standing" :value="shown ? formatStanding(shown.standing) : ''" />
      <StatBlock label="Base" :value="shown ? formatStanding(shown.baseStanding) : ''" />
      <StatBlock label="Earned" :value="shown ? formatSignedStanding(shown.earned) : ''" />
      <BaseSelect
        v-if="seasonOptions.length > 1"
        class="standing-tab__season"
        :model-value="selectedSeason"
        :options="seasonOptions"
        placeholder="Season"
        @update:model-value="setSeason"
      />
    </div>

    <DataTable
      :columns="columns"
      :rows="rows"
      :loading="eventsLoading"
      :loading-rows="loadingRows"
      row-key="id"
      empty-message="No Standing moved yet this season"
    >
      <template #cell-amount="{ value, row }">
        <span class="standing-tab__amount" :class="{ 'standing-tab__amount--down': !row.positive }">{{ value }}</span>
      </template>
      <template #mobile-card="{ row }">
        <span class="ledger-row">
          <span>{{ row.source }}</span>
          <span class="standing-tab__amount" :class="{ 'standing-tab__amount--down': !row.positive }">{{ row.amount }}</span>
          <span class="caption">{{ row.createdAt }}</span>
        </span>
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

.standing-tab__totals {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-xl);
  min-height: 60px;
}

.standing-tab__totals > .stat-block {
  padding: 0;
}

.standing-tab__season {
  margin-left: auto;
}

.standing-tab__amount {
  font-weight: 600;
  color: var(--success);
}

.standing-tab__amount--down {
  color: var(--error);
}
</style>
