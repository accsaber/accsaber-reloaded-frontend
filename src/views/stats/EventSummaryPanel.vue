<script setup lang="ts">
import { formatAccuracy, formatCount, formatShortDate } from '@/utils/formatters'
import DataTable from '@/components/common/DataTable.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import type {
  DistributionEntryResponse,
  EventMissionStatsResponse,
  EventSummaryResponse,
} from '@/types/api/statistics'
import type { TableColumn } from '@/types/display'
import { computed, ref, watch } from 'vue'
import EventMissionLeaderboard from './EventMissionLeaderboard.vue'
import StatsCloseButton from './StatsCloseButton.vue'
import StatsHistogram from './StatsHistogram.vue'
import { fmtDecimal, labelCase, rateClass } from './statsFormat'

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

const WEEK_COLUMN: TableColumn = { key: 'week', label: 'Week', align: 'right', mono: true, width: '80px' }

const BASE_COLUMNS: TableColumn[] = [
  { key: 'mission', label: 'Mission', align: 'left' },
  { key: 'players', label: 'Players', align: 'right', mono: true, width: '100px' },
  { key: 'playersCompleted', label: 'Done', align: 'right', mono: true, width: '90px' },
  { key: 'playersExpired', label: 'Expired', align: 'right', mono: true, width: '100px' },
  { key: 'completionRate', label: 'Rate', align: 'right', mono: true, width: '100px' },
  { key: 'completions', label: 'Completions', align: 'right', mono: true, width: '140px' },
  { key: 'xpPaid', label: 'XP Paid', align: 'right', mono: true, width: '110px' },
]

const loading = ref(false)
const failed = ref(false)
const summary = ref<EventSummaryResponse | null>(null)

const weekOptions = computed(() => (summary.value?.weeks ?? []).map((w) => w.week))

const missionColumns = computed(() =>
  (weekOptions.value.length ? [WEEK_COLUMN, ...BASE_COLUMNS] : BASE_COLUMNS))

const missionRows = computed<Record<string, unknown>[]>(() => {
  const missions: EventMissionStatsResponse[] = summary.value?.missions ?? []
  const scoped = props.week === undefined ? missions : missions.filter((m) => m.week === props.week)
  return scoped.map((m) => ({ ...m }))
})

const retention = computed<DistributionEntryResponse[]>(() =>
  (summary.value?.weeks ?? []).map((w) => ({ label: `Week ${w.week}`, count: w.participantsReached })))

const dateRange = computed(() => {
  if (!summary.value) return ''
  return `${formatShortDate(summary.value.startsAt)} to ${formatShortDate(summary.value.endsAt)}`
})

const openMissionName = computed(
  () => summary.value?.missions.find((m) => m.templateId === props.templateId)?.templateName ?? '',
)

function openMission(row: Record<string, unknown>) {
  const templateId = row.templateId as string | undefined
  if (templateId) emit('update:templateId', templateId)
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
  <section class="event-summary">
    <header class="event-summary__head">
      <div>
        <h3 class="card-title">{{ summary?.title ?? 'Event' }}</h3>
        <p v-if="dateRange" class="event-summary__dates">
          {{ dateRange }}
          <span v-if="summary?.daysRan">({{ formatCount(summary.daysRan) }} days)</span>
        </p>
      </div>
      <StatsCloseButton label="Close event summary" @click="emit('close')" />
    </header>

    <div v-if="loading" class="event-summary__body">
      <SkeletonLoader variant="card" height="120px" />
      <SkeletonLoader variant="card" height="200px" />
    </div>

    <p v-else-if="failed || !summary" class="event-summary__empty">Could not load this event.</p>

    <div v-else class="event-summary__body">
      <dl class="event-summary__stats">
        <div class="event-summary__stat">
          <dt>Participants</dt>
          <dd>{{ formatCount(summary.participants) }}</dd>
        </div>
        <div class="event-summary__stat">
          <dt>Finishers</dt>
          <dd>{{ formatCount(summary.finishers) }}</dd>
        </div>
        <div class="event-summary__stat">
          <dt>Finish rate</dt>
          <dd :class="rateClass(summary.finishRate)">{{ formatAccuracy(summary.finishRate, 1) }}</dd>
        </div>
        <div class="event-summary__stat">
          <dt>Median missions</dt>
          <dd>{{ fmtDecimal(summary.medianMissionsCompleted) }}</dd>
        </div>
        <div class="event-summary__stat">
          <dt>Mission rate</dt>
          <dd :class="rateClass(summary.missionCompletionRate)">{{ formatAccuracy(summary.missionCompletionRate, 1) }}</dd>
        </div>
        <div class="event-summary__stat">
          <dt>XP paid</dt>
          <dd>{{ formatCount(summary.totalXpPaid) }}</dd>
        </div>
      </dl>

      <p class="event-summary__line">
        {{ formatCount(summary.missionsAssigned) }} missions handed out:
        {{ formatCount(summary.missionsCompleted) }} finished,
        {{ formatCount(summary.missionsExpired) }} expired,
        {{ formatCount(summary.missionsOpen) }} still open.
        Of the XP, {{ formatCount(summary.missionXpPaid) }} came from missions and
        {{ formatCount(summary.bonusXpPaid) }} from the completion bonus.
      </p>

      <StatsHistogram v-if="retention.length" title="Still going" :entries="retention" />

      <div v-if="weekOptions.length" class="event-summary__weeks">
        <span class="event-summary__weeks-label field-label">Week</span>
        <button type="button" class="event-summary__week" :class="{ 'event-summary__week--active': week === undefined }"
          @click="emit('update:week', undefined)">
          All
        </button>
        <button v-for="option in weekOptions" :key="option" type="button" class="event-summary__week"
          :class="{ 'event-summary__week--active': week === option }" @click="emit('update:week', option)">
          {{ option }}
        </button>
      </div>

      <DataTable :columns="missionColumns" :rows="missionRows" row-key="templateId" row-clickable
        empty-message="No missions recorded for this week." @row-click="openMission">
        <template #cell-mission="{ row }">
          <span class="event-summary__mission">
            <span class="event-summary__mission-name">{{ row.templateName }}</span>
            <span class="event-summary__mission-meta">
              <span>{{ labelCase(row.type) }}</span>
              <span v-if="row.repeatable" class="event-summary__repeatable">Repeatable</span>
            </span>
          </span>
        </template>
        <template #cell-week="{ value }">{{ formatCount(value as number | null) }}</template>
        <template #cell-players="{ value }">{{ formatCount(value as number | null) }}</template>
        <template #cell-playersCompleted="{ value }">{{ formatCount(value as number | null) }}</template>
        <template #cell-playersExpired="{ value }">{{ formatCount(value as number | null) }}</template>
        <template #cell-completionRate="{ value }">
          <span :class="rateClass(value as number | null)">{{ formatAccuracy(value as number | null, 1) }}</span>
        </template>
        <template #cell-completions="{ value }">{{ formatCount(value as number | null) }}</template>
        <template #cell-xpPaid="{ value }">{{ formatCount(value as number | null) }}</template>
      </DataTable>

      <EventMissionLeaderboard v-if="templateId" :event-key="eventKey" :template-id="templateId"
        :mission-name="openMissionName" :country="country" @close="emit('update:templateId', '')" />
    </div>
  </section>
</template>

<style scoped>
.event-summary {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  padding: var(--space-md);
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-modal);
}

.event-summary__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-md);
}

.event-summary__dates {
  margin: 2px 0 0;
  font-size: var(--text-caption);
  color: var(--text-tertiary);
}

.event-summary__empty {
  margin: 0;
  padding: var(--space-lg) 0;
  text-align: center;
  color: var(--text-tertiary);
}

.event-summary__body {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.event-summary__stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: var(--space-md);
  margin: 0;
}

.event-summary__stat {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-base);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
}

.event-summary__stat dt {
  font-size: var(--text-caption);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-secondary);
}

.event-summary__stat dd {
  margin: 0;
  font-family: var(--font-mono);
  font-size: var(--text-stat-lg);
  font-weight: 500;
  color: var(--text-primary);
}

.event-summary__line {
  margin: 0;
  font-size: var(--text-body);
  color: var(--text-secondary);
  line-height: 1.6;
}

.event-summary__weeks {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-xs);
}

.event-summary__weeks-label {
  margin-right: var(--space-xs);
}

.event-summary__week {
  min-width: 32px;
  padding: var(--space-xs) 10px;
  background: transparent;
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-pill);
  font-family: var(--font-sans);
  font-size: var(--text-caption);
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  transition: color 120ms ease, border-color 120ms ease, background 120ms ease;
}

.event-summary__week:hover {
  color: var(--text-primary);
  border-color: var(--text-tertiary);
}

.event-summary__week--active {
  color: var(--page-accent);
  border-color: var(--page-accent);
  background: color-mix(in srgb, var(--page-accent) 10%, transparent);
}

.event-summary__mission {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.event-summary__mission-name {
  font-weight: 500;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
}

.event-summary__mission-meta {
  display: flex;
  gap: var(--space-sm);
  font-size: 0.6875rem;
  color: var(--text-tertiary);
}

.event-summary__repeatable {
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-secondary);
}
</style>

<style scoped src="./statsRates.css"></style>
