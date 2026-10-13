<script setup lang="ts">
import BaseSelect from '@/components/common/BaseSelect.vue'
import DataTable from '@/components/common/DataTable.vue'
import GlowImage from '@/components/common/GlowImage.vue'
import PaginationControls from '@/components/common/PaginationControls.vue'
import { usePageableRoute } from '@/composables/usePageableRoute'
import { useQueryParams } from '@/composables/useQueryParams'
import type { EventResponse } from '@/types/api/events'
import type { EventParticipationResponse } from '@/types/api/statistics'
import type { TableColumn } from '@/types/display'
import type { Page } from '@/types/pagination'
import { storeCountry } from '@/utils/statsCountry'
import { computed, onMounted, ref, watch } from 'vue'
import EventSummaryPanel from './EventSummaryPanel.vue'
import StatsFilterChips from './StatsFilterChips.vue'
import { fmtDecimal, fmtFraction, fmtInt, plural, rateClass } from './statsFormat'

defineProps<{
  accent: string
  countryOptions: { value: string; label: string }[]
}>()

const COLUMNS: TableColumn[] = [
  { key: 'event', label: 'Event', align: 'left' },
  { key: 'window', label: 'Ran', align: 'left', width: '215px' },
  { key: 'participants', label: 'Participants', align: 'right', mono: true, width: '145px' },
  { key: 'finishers', label: 'Finishers', align: 'right', mono: true, width: '120px' },
  { key: 'finishRate', label: 'Finish rate', align: 'right', mono: true, width: '130px' },
  { key: 'missionsCompleted', label: 'Missions', align: 'right', mono: true, width: '110px' },
  { key: 'averageMissionsPerParticipant', label: 'Avg / player', align: 'right', mono: true, width: '140px' },
]

const { setQuery, queryRef, queryListRef } = useQueryParams()
const { currentPage, setPage } = usePageableRoute({ defaultSort: '', secondarySort: null })

const eventFilter = queryListRef('event')
const countryFilter = queryRef('country')
const openEvent = queryRef('detail')
const weekParam = queryRef('week')
const openTemplate = queryRef('template')
const selectedWeek = computed(() => (Number.isFinite(Number(weekParam.value)) && weekParam.value ? Number(weekParam.value) : undefined))

function setCountry(country: string) {
  storeCountry(country)
  countryFilter.value = country
}

function toggleEvent(slug: string) {
  const active = eventFilter.value
  eventFilter.value = active.includes(slug) ? active.filter((v) => v !== slug) : [...active, slug]
}

function patchDetail(patch: Record<string, string | undefined>) {
  setQuery(patch, { keepPage: true })
}

const events = ref<EventResponse[]>([])

const eventChips = computed(() =>
  events.value.map((e) => ({ key: e.slug, label: e.title })))

const loading = ref(false)
const pageData = ref<Page<EventParticipationResponse> | null>(null)

const totalPages = computed(() => pageData.value?.totalPages ?? 0)
const totalElements = computed(() => pageData.value?.totalElements ?? 0)

const rows = computed<Record<string, unknown>[]>(() =>
  (pageData.value?.content ?? []).map((item) => ({ ...item })))

function formatWindow(row: Record<string, unknown>): string {
  const format = (iso: unknown) => new Date(String(iso)).toLocaleDateString(undefined, { dateStyle: 'medium' })
  return `${format(row.startsAt)} to ${format(row.endsAt)}`
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
      { page: currentPage.value - 1, size: 20 },
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
  <div class="event-stats" :style="{ '--accent': accent }">
    <div class="event-stats__filters">
      <BaseSelect :model-value="countryFilter" :options="countryOptions" placeholder="All Countries" searchable
        @update:model-value="setCountry" />
      <StatsFilterChips v-if="eventChips.length" label="Events" :options="eventChips" :selected="eventFilter"
        empty-label="All events" @toggle="toggleEvent" @clear="eventFilter = []" />
    </div>

    <p v-if="totalElements > 0" class="event-stats__count">{{ plural(totalElements, 'event') }}</p>

    <DataTable :columns="COLUMNS" :rows="rows" :loading="loading" :loading-rows="6" row-key="eventId" row-clickable
      empty-message="No events match this filter yet." @row-click="openSummary">
      <template #cell-event="{ row }">
        <span class="event-cell">
          <GlowImage v-if="row.iconUrl" :src="(row.iconUrl as string)" alt="" :size="28" hide-on-error />
          <span class="event-cell__title">{{ row.title }}</span>
        </span>
      </template>
      <template #cell-window="{ row }">
        <span class="event-stats__dim">{{ formatWindow(row) }}</span>
      </template>
      <template #cell-participants="{ value }"><span class="event-stats__strong">{{ fmtInt(value) }}</span></template>
      <template #cell-finishers="{ value }">{{ fmtInt(value) }}</template>
      <template #cell-finishRate="{ value }">
        <span :class="rateClass(value as number | null)">{{ fmtFraction(value) }}</span>
      </template>
      <template #cell-missionsCompleted="{ value }">{{ fmtInt(value) }}</template>
      <template #cell-averageMissionsPerParticipant="{ value }">{{ fmtDecimal(value) }}</template>
    </DataTable>

    <PaginationControls v-if="totalPages > 1" :page="currentPage" :total-pages="totalPages" @update:page="setPage" />

    <EventSummaryPanel v-if="openEvent" :event-key="openEvent" :country="countryFilter" :week="selectedWeek"
      :template-id="openTemplate"
      @close="patchDetail({ detail: undefined, week: undefined, template: undefined })"
      @update:week="patchDetail({ week: $event === undefined ? undefined : String($event) })"
      @update:template-id="patchDetail({ template: $event || undefined })" />
  </div>
</template>

<style scoped>
.event-stats {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  min-width: 0;
  --page-accent: var(--accent);
}

.event-stats__filters {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-md);
}

.event-stats__count {
  margin: 0;
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--text-secondary);
  text-align: right;
}

.event-stats__strong {
  color: var(--page-accent);
  font-weight: 600;
}

.event-stats__dim {
  color: var(--text-tertiary);
  font-size: var(--text-caption);
}

.event-cell {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  min-width: 0;
}

.event-cell__title {
  font-weight: 500;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>

<style scoped src="./statsRates.css"></style>
