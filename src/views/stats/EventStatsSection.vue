<script setup lang="ts">
import { usePageableRoute } from '@/composables/usePageableRoute'
import { useQueryParams } from '@/composables/useQueryParams'
import type { EventResponse } from '@/types/api/events'
import type { EventParticipationResponse } from '@/types/api/statistics'
import type { TableColumn } from '@/types/display'
import type { Page } from '@/types/pagination'
import { computed, onMounted, ref, watch } from 'vue'
import EventSummaryPanel from './EventSummaryPanel.vue'
import StatsBar from './StatsBar.vue'
import StatsCountrySelect from './StatsCountrySelect.vue'
import StatsFilters, { type StatsFilterGroup } from './StatsFilters.vue'
import StatsNameCell from './StatsNameCell.vue'
import StatsTable from './StatsTable.vue'
import { STATS_PAGE_SIZE, fmt, mainCol, numCol, rateCol } from './statsFormat'

const COLUMNS: TableColumn[] = [
  { key: 'event', label: 'Event', align: 'left' },
  mainCol('participants', 'Participants', 130),
  numCol('finishers', 'Finishers', 110),
  rateCol('finishRate', 'Finish Rate', 120),
  numCol('missionsCompleted', 'Missions', 110),
  numCol('averageMissionsPerParticipant', 'Avg / Player', 130, fmt.decimal),
]

const { setQuery, queryRef, queryListRef } = useQueryParams()
const { currentPage, setPage } = usePageableRoute({ defaultSort: '', secondarySort: null })

const eventFilter = queryListRef('event')
const countryFilter = queryRef('country')
const openEvent = queryRef('detail')
const weekParam = queryRef('week')
const openTemplate = queryRef('template')
const selectedWeek = computed(() => (Number.isFinite(Number(weekParam.value)) && weekParam.value ? Number(weekParam.value) : undefined))

function patchDetail(patch: Record<string, string | undefined>) {
  setQuery(patch, { keepPage: true })
}

const events = ref<EventResponse[]>([])

const filterGroups = computed<StatsFilterGroup[]>(() => [
  {
    key: 'event',
    label: 'Events',
    options: events.value.map((e) => ({ key: e.slug, label: e.title })),
    selected: eventFilter.value,
  },
])

const loading = ref(false)
const pageData = ref<Page<EventParticipationResponse> | null>(null)

const rows = computed(() => (pageData.value?.content ?? []) as unknown as Record<string, unknown>[])

function eventDates(row: Record<string, unknown>): string {
  return `${fmt.date(row.startsAt)} to ${fmt.date(row.endsAt)}`
}

function openSummary(row: Record<string, unknown>) {
  const slug = (row.slug as string) || (row.eventId as string)
  if (slug) patchDetail({ detail: slug, week: undefined, template: undefined })
}

async function fetchEvents() {
  try {
    const { getEvents } = await import('@/api/events')
    events.value = await getEvents()
  } catch {
    return
  }
}

let requestId = 0

async function fetchParticipation() {
  const id = ++requestId
  loading.value = true
  try {
    const { getEventParticipation } = await import('@/api/statistics')
    const result = await getEventParticipation(
      { page: currentPage.value - 1, size: STATS_PAGE_SIZE },
      eventFilter.value,
      countryFilter.value || undefined,
    )
    if (id !== requestId) return
    pageData.value = result
  } catch {
    if (id !== requestId) return
    pageData.value = null
  }
  loading.value = false
}

onMounted(fetchEvents)

watch(
  () => JSON.stringify([eventFilter.value, countryFilter.value, currentPage.value]),
  fetchParticipation,
  { immediate: true },
)
</script>

<template>
  <EventSummaryPanel v-if="openEvent" :event-key="openEvent" :country="countryFilter" :week="selectedWeek"
    :template-id="openTemplate"
    @close="patchDetail({ detail: undefined, week: undefined, template: undefined })"
    @update:week="patchDetail({ week: $event === undefined ? undefined : String($event) })"
    @update:template-id="patchDetail({ template: $event || undefined })" />

  <div v-else class="stats-section">
    <StatsBar :count="pageData?.totalElements ?? 0" noun="event">
      <StatsCountrySelect />
      <StatsFilters v-if="events.length" :groups="filterGroups"
        @change="(key, selected) => setQuery({ [key]: selected })" />
    </StatsBar>

    <StatsTable :columns="COLUMNS" :rows="rows" :loading="loading" :page="currentPage"
      :total-pages="pageData?.totalPages ?? 0" :page-size="6" row-key="eventId" row-clickable
      empty-message="No events match this filter yet" @row-click="openSummary" @update:page="setPage">
      <template #cell-event="{ row }">
        <StatsNameCell :name="(row.title as string)" :meta="eventDates(row)" :icon="(row.iconUrl as string | null)"
          icon-slot />
      </template>
    </StatsTable>
  </div>
</template>
