<script setup lang="ts">
import BaseTabs from '@/components/common/BaseTabs.vue'
import StatBlock from '@/components/common/StatBlock.vue'
import { formatAccuracy, formatCount, formatShortDate } from '@/utils/formatters'
import type { DistributionEntryResponse, EventSummaryResponse } from '@/types/api/statistics'
import type { TableColumn } from '@/types/display'
import { computed, ref, watch } from 'vue'
import EventMissionLeaderboard from './EventMissionLeaderboard.vue'
import StatsDetail from './StatsDetail.vue'
import StatsHistogram from './StatsHistogram.vue'
import StatsNameCell from './StatsNameCell.vue'
import StatsTable from './StatsTable.vue'
import { fmt, labelCase, numCol, rateCol } from './statsFormat'
import { useLocalPages } from './useStatsBoard'

const props = defineProps<{
  eventKey: string
  country: string
  week: number | undefined
  templateId: string
}>()

const emit = defineEmits<{
  close: []
  'update:week': [value: number | undefined]
  'update:templateId': [value: string]
}>()

const WEEK_COLUMN = numCol('week', 'Week', 70)

const BASE_COLUMNS: TableColumn[] = [
  { key: 'mission', label: 'Mission', align: 'left' },
  numCol('players', 'Players', 100),
  numCol('playersCompleted', 'Done', 90),
  numCol('playersExpired', 'Expired', 100),
  { ...rateCol('completionRate', 'Rate', 100), primary: true },
  numCol('completions', 'Completions', 130),
  numCol('xpPaid', 'XP Paid', 110),
]

const loading = ref(false)
const failed = ref(false)
const summary = ref<EventSummaryResponse | null>(null)

const weekOptions = computed(() => (summary.value?.weeks ?? []).map((w) => w.week))

const weekTabs = computed(() => [
  { key: '', label: 'All' },
  ...weekOptions.value.map((w) => ({ key: String(w), label: String(w) })),
])

const missionColumns = computed(() => (weekOptions.value.length ? [WEEK_COLUMN, ...BASE_COLUMNS] : BASE_COLUMNS))

const missions = computed(() => {
  const all = summary.value?.missions ?? []
  const scoped = props.week === undefined ? all : all.filter((m) => m.week === props.week)
  return scoped as unknown as Record<string, unknown>[]
})

const { page, totalPages, pageItems } = useLocalPages(() => missions.value)

const retention = computed<DistributionEntryResponse[]>(() =>
  (summary.value?.weeks ?? []).map((w) => ({ label: `Week ${w.week}`, count: w.participantsReached })))

const stats = computed(() => {
  const s = summary.value
  if (!s) return []
  return [
    { label: 'Participants', value: s.participants },
    { label: 'Finishers', value: s.finishers },
    { label: 'Finish Rate', value: formatAccuracy(s.finishRate, 1) },
    { label: 'Median Missions', value: fmt.decimal(s.medianMissionsCompleted) },
    { label: 'Mission Rate', value: formatAccuracy(s.missionCompletionRate, 1) },
    { label: 'XP Paid', value: s.totalXpPaid },
  ]
})

const openMissionName = computed(
  () => summary.value?.missions.find((m) => m.templateId === props.templateId)?.templateName ?? '',
)

function openMission(row: Record<string, unknown>) {
  const templateId = row.templateId as string | undefined
  if (templateId) emit('update:templateId', templateId)
}

function missionKey(row: Record<string, unknown>): string {
  return `${row.week}-${row.templateId}`
}

function missionMeta(row: Record<string, unknown>): string {
  return row.repeatable ? `${labelCase(row.type)} · Repeatable` : labelCase(row.type)
}

let requestId = 0

async function fetchSummary(eventKey: string, country: string) {
  const id = ++requestId
  loading.value = true
  failed.value = false
  try {
    const { getEventSummary } = await import('@/api/statistics')
    const result = await getEventSummary(eventKey, undefined, country || undefined)
    if (id !== requestId) return
    summary.value = result
  } catch {
    if (id !== requestId) return
    summary.value = null
    failed.value = true
  }
  loading.value = false
}

watch(
  () => [props.eventKey, props.country] as const,
  ([eventKey, country]) => fetchSummary(eventKey, country),
  { immediate: true },
)

watch(weekOptions, (options) => {
  if (props.week !== undefined && !options.includes(props.week)) emit('update:week', undefined)
})
</script>

<template>
  <EventMissionLeaderboard v-if="templateId" :event-key="eventKey" :template-id="templateId"
    :mission-name="openMissionName" :country="country" @close="emit('update:templateId', '')" />

  <StatsDetail v-else :title="summary?.title ?? 'Event'" back="Back to events" :failed="failed" @close="emit('close')">
    <template v-if="summary" #meta>
      {{ formatShortDate(summary.startsAt) }} to {{ formatShortDate(summary.endsAt) }}<template v-if="summary.daysRan">,
        {{ formatCount(summary.daysRan) }} days</template>
    </template>

    <div class="event-summary__stats" :class="{ refreshing: loading }">
      <StatBlock v-for="stat in stats" :key="stat.label" class="event-summary__stat" :label="stat.label"
        :value="stat.value" :decimals="0" />
    </div>

    <p v-if="summary" class="event-summary__line">
      {{ formatCount(summary.missionsAssigned) }} missions given out:
      {{ formatCount(summary.missionsCompleted) }} finished,
      {{ formatCount(summary.missionsExpired) }} expired,
      {{ formatCount(summary.missionsOpen) }} still open.
      Of the XP, {{ formatCount(summary.missionXpPaid) }} came from missions and
      {{ formatCount(summary.bonusXpPaid) }} from the completion bonus.
    </p>

    <StatsHistogram v-if="retention.length" title="Players Still Going" :entries="retention" />

    <BaseTabs v-if="weekOptions.length" class="event-summary__weeks" variant="segmented" label="Week"
      :tabs="weekTabs" :model-value="week === undefined ? '' : String(week)"
      @update:model-value="emit('update:week', $event ? Number($event) : undefined)" />

    <StatsTable v-model:page="page" :columns="missionColumns" :rows="pageItems" :loading="loading"
      :total-pages="totalPages" :row-key="missionKey" row-clickable
      empty-message="No missions recorded for this week" @row-click="openMission">
      <template #cell-mission="{ row }">
        <StatsNameCell :name="(row.templateName as string)" :meta="missionMeta(row)" />
      </template>
    </StatsTable>
  </StatsDetail>
</template>

<style scoped>
.event-summary__stats {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: var(--space-md);
  min-height: 60px;
}

.event-summary__stats .event-summary__stat {
  padding: 0;
}

.event-summary__line {
  margin: 0;
  max-width: 65ch;
  font-size: var(--text-body);
  line-height: 1.5;
  color: var(--text-secondary);
}

.event-summary__weeks {
  align-self: flex-start;
  max-width: 100%;
}

@media (max-width: 767px) {
  .event-summary__stats {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    min-height: 136px;
  }
}
</style>
