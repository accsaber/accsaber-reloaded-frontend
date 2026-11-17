<script setup lang="ts">
import { parseApiError } from '@/api/client'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseTabs from '@/components/common/BaseTabs.vue'
import ConfirmModal from '@/components/common/ConfirmModal.vue'
import DataTable from '@/components/common/DataTable.vue'
import { useConfirmAction } from '@/composables/useConfirmAction'
import { useNow } from '@/composables/useNow'
import type { EventResponse, EventState } from '@/types/api/events'
import type { TableColumn, Tab } from '@/types/display'
import { EVENT_STATE_ACCENT, EVENT_STATE_LABELS, EVENT_STATE_ORDER } from '@/utils/constants'
import { eventState } from '@/utils/events'
import { formatCount, formatDateTime } from '@/utils/formatters'
import { computed, defineAsyncComponent, ref } from 'vue'
import { useRouter } from 'vue-router'

const EventCreateModal = defineAsyncComponent(() => import('@/views/staff/admin/events/EventCreateModal.vue'))

const NOW_TICK_MS = 30000
const LOADING_ROWS = 6
const TIMING_TABS: Tab[] = [
  { key: '', label: 'All' },
  ...EVENT_STATE_ORDER.map((key) => ({ key, label: EVENT_STATE_LABELS[key] })),
]
const ACTIVE_TABS: Tab[] = [
  { key: '', label: 'Any' },
  { key: 'active', label: 'Active' },
  { key: 'inactive', label: 'Inactive' },
]
const COLUMNS: TableColumn[] = [
  { key: 'title', label: 'Title', primary: true },
  { key: 'timing', label: 'Timing', width: '110px' },
  { key: 'active', label: 'State', width: '100px', format: (v) => (v ? 'Active' : 'Inactive') },
  { key: 'startsAt', label: 'Starts', width: '190px', format: (v) => formatDateTime(v as string) },
  { key: 'endsAt', label: 'Ends', width: '190px', format: (v) => formatDateTime(v as string) },
  { key: 'weeks', label: 'Weeks', align: 'right', mono: true, width: '90px' },
  { key: 'bonus', label: 'Bonus', width: '150px' },
  { key: 'actions', label: '', align: 'right', width: '120px', noLink: true },
]

const router = useRouter()
const now = useNow(NOW_TICK_MS)
const { confirmModal, ask } = useConfirmAction()

const events = ref<EventResponse[]>([])
const loading = ref(true)
const error = ref('')
const createMounted = ref(false)
const createOpen = ref(false)
const timingFilter = ref<EventState | ''>('')
const activeFilter = ref<'active' | 'inactive' | ''>('')

function bonus(event: EventResponse): string {
  const parts = [
    event.bonusXp ? `${formatCount(event.bonusXp)} XP` : '',
    event.bonusItems.length ? `${event.bonusItems.length} ${event.bonusItems.length === 1 ? 'item' : 'items'}` : '',
  ].filter(Boolean)
  return parts.join(', ') || '-'
}

const rows = computed<Record<string, unknown>[]>(() =>
  events.value
    .map((event) => ({
      ...event,
      event,
      timing: eventState(event, now.value),
      weeks: event.live && event.currentWeek ? `${event.currentWeek} / ${event.totalWeeks}` : String(event.totalWeeks),
      bonus: bonus(event),
    }))
    .filter((row) => (!timingFilter.value || row.timing === timingFilter.value)
      && (!activeFilter.value || row.active === (activeFilter.value === 'active'))),
)

async function fetchEvents() {
  try {
    const { listAllEvents } = await import('@/api/admin/events')
    events.value = await listAllEvents()
  } catch (err) {
    error.value = parseApiError(err, 'Could not load the events').message
  } finally {
    loading.value = false
  }
}

void fetchEvents()

function editorRoute(row: Record<string, unknown>) {
  return { name: 'admin-event-editor', params: { eventId: row.id as string } }
}

function openCreate() {
  createMounted.value = true
  createOpen.value = true
}

function onCreated(event: EventResponse) {
  createOpen.value = false
  events.value = [event, ...events.value]
  void router.push(editorRoute(event as unknown as Record<string, unknown>))
}

function askDeactivate(event: EventResponse) {
  ask({
    title: 'Deactivate Event',
    message: `Deactivate "${event.title}"? It drops out of the public lists.`,
    confirmLabel: 'Deactivate',
    destructive: true,
    run: async () => {
      const { deactivateEvent } = await import('@/api/admin/events')
      await deactivateEvent(event.id)
      events.value = events.value.map((e) => (e.id === event.id ? { ...e, active: false, live: false } : e))
    },
  })
}
</script>

<template>
  <div class="events-mgmt">
    <div class="events-mgmt__controls">
      <BaseTabs v-model="timingFilter" variant="segmented" label="Timing" :tabs="TIMING_TABS" />
      <BaseTabs v-model="activeFilter" variant="segmented" label="State" :tabs="ACTIVE_TABS" />
      <BaseButton class="events-mgmt__new" variant="primary" @click="openCreate">New Event</BaseButton>
    </div>

    <p v-if="error" class="caption events-mgmt__error" role="alert">{{ error }}</p>

    <DataTable :columns="COLUMNS" :rows="rows" :loading="loading" :loading-rows="LOADING_ROWS" :row-height="56" :row-to="editorRoute"
      row-key="id" empty-message="No events">
      <template #cell-title="{ row }">
        <span class="events-mgmt__title">{{ row.title }}</span>
      </template>
      <template #cell-timing="{ row }">
        <span :style="{ color: EVENT_STATE_ACCENT[row.timing as EventState] }">{{ EVENT_STATE_LABELS[row.timing as EventState] }}</span>
      </template>
      <template #cell-actions="{ row }">
        <BaseButton v-if="row.active" size="sm" variant="destructive" @click="askDeactivate(row.event as EventResponse)">
          Deactivate
        </BaseButton>
      </template>
    </DataTable>

    <EventCreateModal v-if="createMounted" :open="createOpen" @close="createOpen = false" @created="onCreated" />
    <ConfirmModal v-bind="confirmModal" />
  </div>
</template>

<style scoped>
.events-mgmt {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  min-width: 0;
}

.events-mgmt__controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-sm);
}

.events-mgmt__new {
  margin-left: auto;
}

.events-mgmt__error {
  color: var(--error);
}

.events-mgmt__title {
  font-weight: 600;
  color: var(--text-primary);
}
</style>
