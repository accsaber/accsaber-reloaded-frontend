<script setup lang="ts">
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
  const parts: string[] = []
  if (status.value === 'past') return `Ran ${formatFullDate(e.startsAt)} to ${formatFullDate(e.endsAt)}`
  if (status.value === 'upcoming') {
    parts.push(`Begins ${formatFullDate(e.startsAt)}`)
    if (e.totalWeeks > 1) parts.push(`${e.totalWeeks} weeks`)
    return parts.join(' · ')
  }
  if (!enrolled.value && e.currentWeek) parts.push(`Week ${e.currentWeek} of ${e.totalWeeks}`)
  parts.push(`Ends ${formatFullDate(e.endsAt)}`)
  return parts.join(' · ')
})

function isCommunity(mission: MissionResponse): boolean {
  return mission.pool === 'community'
}

async function loadCommunity(eventUuid: string, templates: MissionResponse[]) {
  communityMissions.value = templates
  if (!templates.length) return
  try {
    const { getCommunityMissions } = await import('@/api/missions')
    const rows = await getCommunityMissions({ eventId: eventUuid, active: false })
    communityMissions.value = mergeCommunityMissions(templates, rows)
  } catch {
    communityMissions.value = templates
  }
}

function applyProgress(res: EventProgressResponse) {
  event.value = res.event
  const personal = res.missions.filter((entry) => !isCommunity(entry.mission))
  missions.value = personal.map(missionViewFromProgress)
  profile.value = res.profile
  begun.value = res.begun
  bonusAwarded.value = res.bonusAwarded
  void loadCommunity(
    res.event.id,
    res.missions.filter((entry) => isCommunity(entry.mission)).map((entry) => entry.mission),
  )
}

async function load(id: string, loggedIn: boolean, silent = false) {
  if (!silent) loading.value = true
  failed.value = false
  try {
    const api = await import('@/api/events')
    if (loggedIn) {
      applyProgress(await api.getEventProgress(id))
    } else {
      const res = await api.getEventDetail(id)
      event.value = res.event
      missions.value = res.missions.filter((m) => !isCommunity(m)).map(missionViewFromDefinition)
      profile.value = null
      begun.value = false
      bonusAwarded.value = false
      void loadCommunity(res.event.id, res.missions.filter(isCommunity))
    }
  } catch {
    if (!silent) {
      event.value = null
      missions.value = []
      communityMissions.value = []
      failed.value = true
    }
  } finally {
    loading.value = false
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
    applyProgress(await beginEvent(props.eventId))
  } catch (e) {
    beginError.value =
      e instanceof Error && /not live/i.test(e.message)
        ? 'This event is not currently live.'
        : 'Could not begin the event. Please try again.'
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
    <div v-if="loading" class="event-detail__loading">
      <SkeletonLoader variant="card" style="height: 240px" />
      <SkeletonLoader variant="text" style="height: 56px; width: 60%; margin-top: var(--space-xl)" />
      <SkeletonLoader variant="text" style="height: 22px; width: 40%; margin-top: var(--space-md)" />
    </div>

    <EmptyState v-else-if="failed || !event" message="This event couldn't be loaded." />

    <template v-else>
      <div v-if="event.backgroundUrl" class="event-detail__banner">
        <img :src="event.backgroundUrl" :alt="event.title" decoding="async" />
      </div>

      <div class="event-detail__grid">
        <div class="event-detail__lead">
          <h1 v-if="!event.backgroundUrl" class="event-detail__title">{{ event.title }}</h1>

          <p v-if="countdown" class="event-detail__countdown">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <polyline points="12 7 12 12 15 14" />
            </svg>
            {{ countdown }}
          </p>
          <p class="event-detail__timing">{{ timing }}</p>

          <EventProgressBar
            v-if="enrolled && profile"
            :profile="profile"
            :total-missions="missions.length"
            :total-weeks="event.totalWeeks"
          />

          <div v-if="showBegin" class="event-detail__begin">
            <BaseButton variant="primary" size="lg" :loading="beginBusy" @click="onBegin">
              {{ loggedIn ? 'Begin Event' : 'Log in to begin' }}
            </BaseButton>
            <p v-if="beginError" class="event-detail__begin-error">{{ beginError }}</p>
          </div>

          <p v-if="event.description" class="event-detail__description">{{ event.description }}</p>

          <div v-if="event.bonusXp || event.bonusItems.length" class="event-detail__bonus">
            <div class="event-detail__bonus-head">
              <span class="event-detail__bonus-label">Complete all missions to earn</span>
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

.event-detail__loading {
  display: flex;
  flex-direction: column;
}

.event-detail__banner {
  width: 100%;
  height: clamp(180px, 20vw, 260px);
  border-radius: var(--radius-card);
  overflow: hidden;
  border: 1px solid var(--bg-overlay);
  background: var(--bg-surface);
}

.event-detail__banner img {
  width: 100%;
  height: 100%;
  object-fit: cover;
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
  letter-spacing: -0.02em;
}

.event-detail__countdown {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  align-self: flex-start;
  margin: calc(-1 * var(--space-sm)) 0 calc(-1 * var(--space-sm));
  color: var(--status-accent);
  font-size: 1.2rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.event-detail__timing {
  margin: 0;
  font-size: 0.85rem;
  color: var(--text-tertiary);
  font-variant-numeric: tabular-nums;
}

.event-detail__begin {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-sm);
}

.event-detail__begin-error {
  margin: 0;
  font-size: var(--text-caption);
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
  padding: var(--space-lg) var(--space-xl);
  width: fit-content;
  max-width: 100%;
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  background: var(--bg-surface);
}

.event-detail__bonus-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
}

.event-detail__bonus-label {
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-secondary);
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
  gap: var(--space-md);
  align-items: center;
}

@media (max-width: 959px) {
  .event-detail__grid {
    grid-template-columns: 1fr;
    gap: var(--space-2xl);
  }

  .event-detail__banner {
    height: clamp(140px, 40vw, 200px);
  }

  .event-detail__title {
    font-size: clamp(2rem, 8vw, 2.5rem);
  }
}
</style>
