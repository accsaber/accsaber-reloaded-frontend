<script setup lang="ts">
import { parseApiError } from '@/api/client'
import BaseButton from '@/components/common/BaseButton.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import PseudoLoginModal from '@/components/domain/PseudoLoginModal.vue'
import EventMissionsPanel from '@/views/news/EventMissionsPanel.vue'
import EventProgressBar from '@/views/news/EventProgressBar.vue'
import RewardAmountTile from '@/components/domain/RewardAmountTile.vue'
import RewardItemTile from '@/components/domain/RewardItemTile.vue'
import type { EventProfileResponse, EventProgressResponse, EventResponse } from '@/types/api/events'
import type { MissionResponse } from '@/types/api/missions'
import {
  EVENT_STATUS_COLOR,
  eventCountdown,
  eventStatus,
  mergeCommunityMissions,
  missionViewFromDefinition,
  missionViewFromProgress,
  type EventMissionView,
} from '@/utils/events'
import { formatFullDate } from '@/utils/formatters'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

const props = defineProps<{
  eventId: string
  loggedIn: boolean
  now: number
}>()

const event = ref<EventResponse | null>(null)
const missions = ref<EventMissionView[]>([])
const communityMissions = ref<MissionResponse[]>([])
const profile = ref<EventProfileResponse | null>(null)
const begun = ref(false)
const bonusAwarded = ref(false)
const loading = ref(true)
const failed = ref(false)

const beginBusy = ref(false)
const beginError = ref<string | null>(null)
const loginOpen = ref(false)

const status = computed(() => (event.value ? eventStatus(event.value, props.now) : 'past'))
const statusColor = computed(() => EVENT_STATUS_COLOR[status.value])
const countdown = computed(() => (event.value ? eventCountdown(event.value, props.now) : null))

const enrolled = computed(() => props.loggedIn && begun.value && profile.value !== null)
const showBegin = computed(() => !!event.value?.live && !enrolled.value)
const panelBegun = computed<boolean | null>(() => (props.loggedIn ? begun.value : null))

const timing = computed(() => {
  const e = event.value
  if (!e) return ''
  if (status.value === 'past') return `Ran ${formatFullDate(e.startsAt)} to ${formatFullDate(e.endsAt)}`
  if (status.value === 'upcoming') {
    const begins = `Begins ${formatFullDate(e.startsAt)}`
    return e.totalWeeks > 1 ? `${begins} · ${e.totalWeeks} weeks` : begins
  }
  const ends = `Ends ${formatFullDate(e.endsAt)}`
  return !enrolled.value && e.currentWeek ? `Week ${e.currentWeek} of ${e.totalWeeks} · ${ends}` : ends
})

function isCommunity(mission: MissionResponse): boolean {
  return mission.pool === 'community'
}

let requestId = 0

async function loadCommunity(eventUuid: string, templates: MissionResponse[], request: number) {
  communityMissions.value = templates
  if (!templates.length) return
  try {
    const { getCommunityMissions } = await import('@/api/missions')
    const rows = await getCommunityMissions({ eventId: eventUuid, active: false })
    if (request === requestId) communityMissions.value = mergeCommunityMissions(templates, rows)
  } catch {
    return
  }
}

function applyProgress(res: EventProgressResponse, request: number) {
  event.value = res.event
  const personal = res.missions.filter((entry) => !isCommunity(entry.mission))
  missions.value = personal.map(missionViewFromProgress)
  profile.value = res.profile
  begun.value = res.begun
  bonusAwarded.value = res.bonusAwarded
  void loadCommunity(
    res.event.id,
    res.missions.filter((entry) => isCommunity(entry.mission)).map((entry) => entry.mission),
    request,
  )
}

async function load(id: string, loggedIn: boolean, silent = false) {
  const request = ++requestId
  if (!silent) loading.value = true
  failed.value = false
  try {
    const api = await import('@/api/events')
    if (loggedIn) {
      const res = await api.getEventProgress(id)
      if (request === requestId) applyProgress(res, request)
    } else {
      const res = await api.getEventDetail(id)
      if (request !== requestId) return
      event.value = res.event
      missions.value = res.missions.filter((m) => !isCommunity(m)).map(missionViewFromDefinition)
      profile.value = null
      begun.value = false
      bonusAwarded.value = false
      void loadCommunity(res.event.id, res.missions.filter(isCommunity), request)
    }
  } catch {
    if (!silent && request === requestId) {
      event.value = null
      missions.value = []
      communityMissions.value = []
      failed.value = true
    }
  } finally {
    if (request === requestId) loading.value = false
  }
}

async function onBegin() {
  if (!props.loggedIn) {
    loginOpen.value = true
    return
  }
  beginBusy.value = true
  beginError.value = null
  try {
    const { beginEvent } = await import('@/api/events')
    const res = await beginEvent(props.eventId)
    applyProgress(res, ++requestId)
  } catch (e) {
    beginError.value = parseApiError(e, 'Could not begin the event').message
  } finally {
    beginBusy.value = false
  }
}

function onVisibility() {
  if (document.visibilityState === 'visible' && event.value) {
    load(props.eventId, props.loggedIn, true)
  }
}

watch(
  () => [props.eventId, props.loggedIn] as const,
  ([id, loggedIn]) => load(id, loggedIn),
  { immediate: true },
)

onMounted(() => document.addEventListener('visibilitychange', onVisibility))
onUnmounted(() => document.removeEventListener('visibilitychange', onVisibility))
</script>

<template>
  <div class="event-detail" :style="{ '--status-accent': statusColor }">
    <div v-if="loading" class="event-detail__grid">
      <div class="event-detail__lead">
        <SkeletonLoader height="28px" width="60%" />
        <SkeletonLoader height="96px" />
      </div>
      <SkeletonLoader height="420px" />
    </div>

    <EmptyState v-else-if="failed || !event" message="This event couldn't be loaded." />

    <template v-else>
      <div v-if="event.backgroundUrl" class="event-detail__banner">
        <img :src="event.backgroundUrl" :alt="event.title" decoding="async" />
      </div>

      <div class="event-detail__grid">
        <div class="event-detail__lead">
          <h1 v-if="!event.backgroundUrl" class="event-detail__title">{{ event.title }}</h1>

          <p class="event-detail__when">
            <span v-if="countdown" class="event-detail__countdown">{{ countdown }}</span>
            <span class="caption">{{ timing }}</span>
          </p>

          <EventProgressBar
            v-if="enrolled && profile"
            :profile="profile"
            :total-missions="missions.length"
          />

          <div v-if="showBegin" class="event-detail__begin">
            <BaseButton variant="primary" size="lg" :loading="beginBusy" @click="onBegin">
              {{ loggedIn ? 'Begin Event' : 'Log in to begin' }}
            </BaseButton>
            <p v-if="beginError" class="caption event-detail__begin-error">{{ beginError }}</p>
          </div>

          <p v-if="event.description" class="event-detail__description">{{ event.description }}</p>

          <div v-if="event.bonusXp || event.bonusItems.length" class="event-detail__bonus">
            <div class="event-detail__bonus-head">
              <span class="field-label">Complete all missions to earn</span>
              <span v-if="bonusAwarded" class="event-detail__bonus-claimed">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"
                  stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Claimed
              </span>
            </div>
            <div class="event-detail__bonus-rewards">
              <RewardAmountTile v-if="event.bonusXp" :amount="event.bonusXp" label="XP" />
              <RewardItemTile
                v-for="item in event.bonusItems"
                :key="item.id"
                :item="item"
                :size="80"
              />
            </div>
          </div>
        </div>

        <EventMissionsPanel
          class="event-detail__missions"
          :missions="missions"
          :community-missions="communityMissions"
          :join-prompt="showBegin"
          :current-week="event.currentWeek ?? null"
          :total-weeks="event.totalWeeks"
          :unlocked-week="profile?.unlockedWeek ?? null"
          :begun="panelBegun"
          :live="event.live"
          :ended="status === 'past'"
          :now="now"
        />
      </div>
    </template>

    <PseudoLoginModal v-if="loginOpen" :open="loginOpen" @close="loginOpen = false" />
  </div>
</template>

<style scoped>
.event-detail {
  display: flex;
  flex-direction: column;
  gap: var(--space-xl);
  --page-accent: var(--accent-overall);
}

.event-detail__banner {
  border-radius: var(--radius-card);
  overflow: hidden;
  border: 1px solid var(--bg-overlay);
  background: var(--bg-surface);
}

.event-detail__banner img {
  width: 100%;
  height: auto;
  display: block;
}

.event-detail__grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr);
  gap: var(--space-2xl);
  align-items: start;
}

.event-detail__lead {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  min-width: 0;
}

.event-detail__title {
  font-size: clamp(2.5rem, 4vw, 3.75rem);
  line-height: 1.04;
}

.event-detail__when {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--space-xs) var(--space-md);
  margin: 0;
}

.event-detail__countdown {
  color: var(--status-accent);
  font-size: var(--text-section-heading);
  font-weight: 600;
}

.event-detail__begin {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-sm);
}

.event-detail__begin-error {
  color: var(--error);
}

.event-detail__description {
  margin: 0;
  max-width: 60ch;
  font-size: 1.15rem;
  line-height: 1.75;
  color: var(--text-secondary);
  white-space: pre-line;
}

.event-detail__bonus {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  width: fit-content;
  max-width: 100%;
  padding: var(--space-md);
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
}

.event-detail__bonus-head {
  display: flex;
  align-items: baseline;
  gap: var(--space-md);
}

.event-detail__bonus-claimed {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  font-size: var(--text-caption);
  font-weight: 600;
  color: var(--success);
}

.event-detail__bonus-rewards {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
  align-items: center;
}

@media (max-width: 959px) {
  .event-detail__grid {
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-xl);
  }

  .event-detail__title {
    font-size: clamp(2rem, 8vw, 2.5rem);
  }
}
</style>
