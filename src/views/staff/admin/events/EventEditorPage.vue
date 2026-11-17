<script setup lang="ts">
import { formatCount, formatDateTime } from '@/utils/formatters'
import {
  deactivateEvent,
  deleteEventBackground,
  deleteEventIcon,
  getAdminEvent,
  getAdminEventMissions,
  rolloutEventMissions,
  updateEvent,
  uploadEventBackground,
  uploadEventIcon,
} from '@/api/admin/events'
import { parseApiError } from '@/api/client'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseTextarea from '@/components/common/BaseTextarea.vue'
import ConfirmModal from '@/components/common/ConfirmModal.vue'
import DataTable from '@/components/common/DataTable.vue'
import IconButton from '@/components/common/IconButton.vue'
import ImageUploader from '@/components/common/ImageUploader.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import { useConfirmAction } from '@/composables/useConfirmAction'
import { useNow } from '@/composables/useNow'
import { usePageMeta } from '@/composables/usePageMeta'
import type {
  EventBonusItem,
  EventRequest,
  EventResponse,
  MissionTemplateResponse,
} from '@/types/api/events'
import type { ItemResponse } from '@/types/api/items'
import type { TableColumn } from '@/types/display'
import { EVENT_STATE_ACCENT, EVENT_STATE_LABELS } from '@/utils/constants'
import {
  eventState,
  isoToLocalInput,
  localInputToIso,
  slugify,
} from '@/utils/events'
import AdminItemPicker from '@/components/admin/AdminItemPicker.vue'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const NOW_TICK_MS = 30000
const MISSION_COLUMNS: TableColumn[] = [
  { key: 'name', label: 'Mission', primary: true },
  { key: 'type', label: 'Type', width: '140px' },
  { key: 'window', label: 'Window', width: '320px' },
  { key: 'xp', label: 'XP', align: 'right', mono: true, width: '110px' },
  { key: 'reward', label: 'Reward', width: '180px' },
  { key: 'repeat', label: 'Repeat', align: 'right', width: '90px' },
]

const now = useNow(NOW_TICK_MS)
const { confirmModal, ask } = useConfirmAction()

const eventId = computed(() => String(route.params.eventId))

const event = ref<EventResponse | null>(null)

usePageMeta({
  title: computed(() =>
    event.value ? `${event.value.title} | AccSaber Admin` : 'Event | AccSaber Admin',
  ),
  description: 'Event editor.',
})

const missions = ref<MissionTemplateResponse[]>([])
const loading = ref(true)
const errorMsg = ref<string | null>(null)

const metaSaving = ref(false)
const statusBusy = ref(false)
const rolloutBusy = ref(false)
const rolloutDone = ref(false)
const bonusBusy = ref(false)
const pickerOpen = ref(false)

const form = ref({
  title: '',
  slug: '',
  description: '',
  startsAt: '',
  endsAt: '',
  bonusXp: '',
})

const slugError = ref('')

const timing = computed(() => (event.value ? eventState(event.value, now.value) : 'upcoming'))

const slugPreview = computed(() => slugify(form.value.slug))
const slugChanged = computed(() => !!event.value && slugPreview.value !== event.value.slug)

const bonusItems = computed<EventBonusItem[]>(() => event.value?.bonusItems ?? [])
const bonusItemIds = computed(() => bonusItems.value.map((i) => i.id))

function syncForm() {
  if (!event.value) return
  form.value = {
    title: event.value.title,
    slug: event.value.slug,
    description: event.value.description ?? '',
    startsAt: isoToLocalInput(event.value.startsAt),
    endsAt: isoToLocalInput(event.value.endsAt),
    bonusXp: event.value.bonusXp != null ? String(event.value.bonusXp) : '',
  }
  slugError.value = ''
}

async function refresh() {
  loading.value = true
  errorMsg.value = null
  try {
    const [detail, missionTemplates] = await Promise.all([
      getAdminEvent(eventId.value),
      getAdminEventMissions(eventId.value),
    ])
    event.value = detail
    missions.value = missionTemplates
    syncForm()
  } catch (e) {
    errorMsg.value = parseApiError(e, 'Failed to load event').message
  } finally {
    loading.value = false
  }
}

onMounted(refresh)
watch(eventId, refresh)

async function saveMetadata() {
  if (!event.value) return
  const startIso = localInputToIso(form.value.startsAt)
  const endIso = localInputToIso(form.value.endsAt)
  if (!form.value.title.trim()) {
    errorMsg.value = 'Title is required.'
    return
  }
  if (!startIso || !endIso) {
    errorMsg.value = 'Start and end dates are required.'
    return
  }
  if (new Date(endIso).getTime() <= new Date(startIso).getTime()) {
    errorMsg.value = 'End must be after start.'
    return
  }
  metaSaving.value = true
  errorMsg.value = null
  slugError.value = ''
  try {
    const req: EventRequest = {
      title: form.value.title.trim(),
      description: form.value.description.trim(),
      startsAt: startIso,
      endsAt: endIso,
      bonusXp: form.value.bonusXp.trim() ? Math.max(0, Number.parseInt(form.value.bonusXp, 10) || 0) : 0,
    }
    if (slugChanged.value && form.value.slug.trim()) req.slug = form.value.slug.trim()
    event.value = await updateEvent(eventId.value, req)
    syncForm()
  } catch (e) {
    const parsed = parseApiError(e, 'Failed to save event')
    const slugField = parsed.fieldErrors.find((f) => f.field === 'slug')
    if (slugField) {
      slugError.value = slugField.message
    } else if (parsed.status === 422 && /slug/i.test(parsed.message)) {
      slugError.value = parsed.message
    } else {
      errorMsg.value = parsed.message
    }
  } finally {
    metaSaving.value = false
  }
}

async function uploadBackground(file: File) {
  event.value = await uploadEventBackground(eventId.value, file)
}

async function removeBackground() {
  event.value = await deleteEventBackground(eventId.value)
}

async function uploadIcon(file: File) {
  event.value = await uploadEventIcon(eventId.value, file)
}

async function removeIcon() {
  event.value = await deleteEventIcon(eventId.value)
}

async function commitBonusItems(ids: string[]) {
  bonusBusy.value = true
  errorMsg.value = null
  try {
    event.value = await updateEvent(eventId.value, { bonusItemIds: ids })
  } catch (e) {
    errorMsg.value = parseApiError(e, 'Failed to update bonus items').message
  } finally {
    bonusBusy.value = false
  }
}

function onPickItem(item: ItemResponse) {
  if (bonusItemIds.value.includes(item.id)) return
  pickerOpen.value = false
  commitBonusItems([...bonusItemIds.value, item.id])
}

function removeBonusItem(id: string) {
  commitBonusItems(bonusItemIds.value.filter((x) => x !== id))
}

async function setActive(call: () => Promise<EventResponse>) {
  statusBusy.value = true
  errorMsg.value = null
  try {
    event.value = await call()
    syncForm()
  } finally {
    statusBusy.value = false
  }
}

function toggleActive() {
  if (!event.value) return
  if (!event.value.active) {
    setActive(() => updateEvent(eventId.value, { active: true })).catch((e) => {
      errorMsg.value = parseApiError(e, 'Could not reactivate the event').message
    })
    return
  }
  ask({
    title: 'Deactivate Event',
    message: 'Deactivate this event? It drops out of the public lists.',
    confirmLabel: 'Deactivate',
    destructive: true,
    run: () => setActive(async () => {
      await deactivateEvent(eventId.value)
      return getAdminEvent(eventId.value)
    }),
  })
}

async function rollout() {
  rolloutBusy.value = true
  rolloutDone.value = false
  errorMsg.value = null
  try {
    await rolloutEventMissions(eventId.value)
    rolloutDone.value = true
  } catch (e) {
    errorMsg.value = parseApiError(e, 'Failed to roll out missions').message
  } finally {
    rolloutBusy.value = false
  }
}

const missionRows = computed<Record<string, unknown>[]>(() =>
  missions.value.map((m) => ({
    id: m.id,
    name: m.name,
    code: m.code,
    type: m.type,
    window: `${m.unlocksAt ? formatDateTime(m.unlocksAt) : 'Event start'} to ${m.completableUntil ? formatDateTime(m.completableUntil) : 'event end'}`,
    xp: m.fixedXp != null ? formatCount(m.fixedXp) : '-',
    reward: m.awardsItemName ?? '-',
    repeat: !m.repeatable ? 'No' : m.maxCompletions ? `x${m.maxCompletions}` : 'Yes',
  })),
)
</script>

<template>
  <div class="event-editor">
    <header class="event-editor__header">
      <IconButton icon="back" label="Back to events" @click="router.push({ name: 'admin', query: { tab: 'events' } })" />
      <h1 class="event-editor__title">{{ event?.title || 'Event' }}</h1>
      <template v-if="event">
        <span :style="{ color: EVENT_STATE_ACCENT[timing] }">{{ EVENT_STATE_LABELS[timing] }}</span>
        <span :class="{ 'event-editor__off': !event.active }">{{ event.active ? 'Active' : 'Inactive, hidden from players' }}</span>
        <BaseButton :variant="event.active ? 'destructive' : 'primary'" :loading="statusBusy" @click="toggleActive">
          {{ event.active ? 'Deactivate' : 'Reactivate' }}
        </BaseButton>
      </template>
    </header>

    <p v-if="errorMsg" class="caption event-editor__error" role="alert">{{ errorMsg }}</p>

    <template v-if="loading">
      <SkeletonLoader v-for="n in 3" :key="n" class="placeholder" height="260px" />
    </template>

    <template v-else-if="event">
      <section class="event-editor__panel">
        <h2 class="section-title">Details</h2>
        <div class="event-editor__grid">
          <BaseInput v-model="form.title" label="Title" />
          <BaseInput v-model="form.slug" label="Slug" :placeholder="slugPreview" :error="slugError" />
          <BaseInput v-model="form.startsAt" type="datetime-local" label="Starts" />
          <BaseInput v-model="form.endsAt" type="datetime-local" label="Ends" />
          <BaseInput v-model="form.bonusXp" type="number" min="0" step="1" label="Completion Bonus XP" />
          <span class="event-editor__weeks">
            <span class="field-label">Weeks</span>
            <span>{{ event.live && event.currentWeek ? `${event.currentWeek} of ${event.totalWeeks}` : event.totalWeeks }}</span>
          </span>
          <BaseTextarea v-model="form.description" class="event-editor__full" label="Description" :rows="3" />
        </div>
        <BaseButton class="event-editor__save" variant="primary" :loading="metaSaving" @click="saveMetadata">Save Details</BaseButton>
      </section>

      <section class="event-editor__panel">
        <h2 class="section-title">Images</h2>
        <div class="event-editor__images">
          <ImageUploader label="Background" :image-url="event.backgroundUrl ?? null" :upload-handler="uploadBackground"
            :remove-handler="removeBackground" />
          <ImageUploader label="Icon" aspect-ratio="1 / 1" :image-url="event.iconUrl ?? null" :upload-handler="uploadIcon"
            :remove-handler="removeIcon" />
        </div>
      </section>

      <section class="event-editor__panel">
        <header class="event-editor__panel-head">
          <h2 class="section-title">Completion Bonus Items</h2>
          <BaseButton :loading="bonusBusy" @click="pickerOpen = true">Add Item</BaseButton>
        </header>
        <ul v-if="bonusItems.length" class="event-editor__items">
          <li v-for="item in bonusItems" :key="item.id" class="event-editor__item">
            {{ item.name }}
            <IconButton icon="close" :label="`Remove ${item.name}`" :disabled="bonusBusy" @click="removeBonusItem(item.id)" />
          </li>
        </ul>
        <p v-else class="caption">No bonus items</p>
      </section>

      <section class="event-editor__panel">
        <header class="event-editor__panel-head">
          <h2 class="section-title">Missions</h2>
          <span class="event-editor__rollout">
            <span v-if="rolloutDone" class="caption" role="status">Rollout started</span>
            <BaseButton variant="primary" :class="{ confirm: rolloutDone }" :loading="rolloutBusy" @click="rollout">
              Roll Out to Players
            </BaseButton>
          </span>
        </header>
        <DataTable :columns="MISSION_COLUMNS" :rows="missionRows" row-key="id" empty-message="No mission templates yet">
          <template #cell-name="{ row }">
            <span class="event-editor__mission">
              <span class="event-editor__mission-name">{{ row.name }}</span>
              <span class="caption">{{ row.code }}</span>
            </span>
          </template>
        </DataTable>
      </section>
    </template>

    <AdminItemPicker v-if="pickerOpen" title="Add Bonus Item" :exclude-ids="bonusItemIds" @close="pickerOpen = false"
      @pick="onPickItem" />
    <ConfirmModal v-bind="confirmModal" />
  </div>
</template>

<style scoped>
.event-editor {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  width: 100%;
  max-width: 1280px;
  min-width: 0;
  margin: 0 auto;
}

.event-editor__header,
.event-editor__panel-head,
.event-editor__rollout {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-sm) var(--space-md);
}

.event-editor__title {
  flex: 1;
  min-width: 0;
}

.event-editor__off {
  color: var(--warning);
}

.event-editor__error {
  color: var(--error);
}

.event-editor__panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  padding: var(--space-md) var(--space-lg);
  background: var(--bg-surface);
  border-radius: var(--radius-card);
}

.event-editor__panel-head {
  justify-content: space-between;
}

.event-editor__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-md);
}

.event-editor__full {
  grid-column: 1 / -1;
}

.event-editor__weeks {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.event-editor__save {
  align-self: flex-start;
}

.event-editor__images {
  display: grid;
  grid-template-columns: minmax(0, 480px) minmax(0, 200px);
  gap: var(--space-lg);
  align-items: start;
}

.event-editor__items {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs) var(--space-lg);
  margin: 0;
  padding: 0;
  list-style: none;
}

.event-editor__item {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  font-weight: 600;
  color: var(--text-primary);
}

.event-editor__mission {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.event-editor__mission-name {
  font-weight: 600;
  color: var(--text-primary);
}

@media (max-width: 767px) {
  .event-editor__grid,
  .event-editor__images {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
