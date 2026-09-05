<script setup lang="ts">
import EmptyState from '@/components/common/EmptyState.vue'
import { useNow } from '@/composables/useNow'
import type { MissionResponse } from '@/types/api/missions'
import CommunityContributorsModal from '@/views/news/CommunityContributorsModal.vue'
import CommunityMissionRow from '@/views/news/CommunityMissionRow.vue'
import EventMissionRow from '@/views/news/EventMissionRow.vue'
import { missionLockState, type EventMissionView } from '@/utils/events'
import { computed, nextTick, onMounted, ref, watch } from 'vue'

const props = defineProps<{
  missions: EventMissionView[]
  communityMissions: MissionResponse[]
  currentWeek: number | null
  totalWeeks: number
  unlockedWeek: number | null
  begun: boolean | null
  live: boolean
  joinPrompt: boolean
}>()

type Tab = number | 'all'

const now = useNow()
const activeTab = ref<Tab>(1)
const openId = ref<string | null>(null)

const weeks = computed(() => Math.max(1, props.totalWeeks))

const globalCommunity = computed(() =>
  sortCommunity(props.communityMissions.filter((m) => m.endsWithWeek !== true)),
)

const weeklyCommunity = computed(() =>
  sortCommunity(props.communityMissions.filter((m) => m.endsWithWeek === true)),
)

const hasGlobalTab = computed(() => globalCommunity.value.length > 0)
const showTabs = computed(() => weeks.value > 1 || hasGlobalTab.value)

function deadline(mission: MissionResponse): number {
  return mission.expiresAt ? new Date(mission.expiresAt).getTime() : Number.POSITIVE_INFINITY
}

function communityRank(mission: MissionResponse): number {
  if (mission.status === 'active') return 0
  if (mission.status == null) return 1
  return mission.status === 'completed' ? 2 : 3
}

function sortCommunity(list: MissionResponse[]): MissionResponse[] {
  return [...list].sort((a, b) => {
    const rankA = communityRank(a)
    if (rankA !== communityRank(b)) return rankA - communityRank(b)
    return rankA >= 2 ? deadline(b) - deadline(a) : deadline(a) - deadline(b)
  })
}

function weekLocked(w: number): boolean {
  if (props.currentWeek == null || w > props.currentWeek) return true
  if (props.begun && props.unlockedWeek != null && w > props.unlockedWeek) return true
  return false
}

function weekComplete(w: number): boolean {
  const wm = props.missions.filter((m) => m.week === w)
  return wm.length > 0 && wm.every((m) => m.tracked && m.completed)
}

const weekList = computed(() =>
  Array.from({ length: weeks.value }, (_, i) => {
    const n = i + 1
    const locked = weekLocked(n)
    return { n, locked, current: props.currentWeek === n, complete: !locked && weekComplete(n) }
  }),
)

const activeWeekLocked = computed(
  () => activeTab.value !== 'all' && weekLocked(activeTab.value),
)

const visibleRows = computed(() => {
  if (activeTab.value === 'all') return []
  const week = activeTab.value
  const filtered = showTabs.value ? props.missions.filter((m) => m.week === week) : props.missions
  return filtered.map((mission) => ({
    mission,
    lock: missionLockState(mission, {
      begun: props.begun,
      currentWeek: props.currentWeek,
      live: props.live,
    }),
  }))
})

const visibleCommunity = computed(() => {
  if (activeTab.value === 'all') return globalCommunity.value
  if (!showTabs.value) return weeklyCommunity.value
  const week = activeTab.value
  return weeklyCommunity.value.filter((m) => (m.week ?? 1) === week)
})

function communityLocked(mission: MissionResponse): boolean {
  return activeTab.value !== 'all' && mission.unlocked === false
}

const showGroupLabels = computed(
  () => visibleRows.value.length > 0 && visibleCommunity.value.length > 0,
)

const openMission = computed(
  () => props.communityMissions.find((m) => m.id === openId.value) ?? null,
)

const listRef = ref<HTMLElement | null>(null)
const scrollable = ref(false)
const atEnd = ref(true)

const showScrollCue = computed(() => scrollable.value && !atEnd.value)

function measureScroll() {
  const el = listRef.value
  if (!el) {
    scrollable.value = false
    atEnd.value = true
    return
  }
  const max = el.scrollHeight - el.clientHeight
  scrollable.value = max > 1
  atEnd.value = el.scrollTop >= max - 1
}

onMounted(measureScroll)

watch([visibleRows, visibleCommunity], () => {
  if (listRef.value) listRef.value.scrollTop = 0
  nextTick(measureScroll)
})

watch(hasGlobalTab, (has) => {
  if (!has && activeTab.value === 'all') activeTab.value = 1
})

watch(
  () => [props.totalWeeks, props.currentWeek] as const,
  () => {
    const target = props.currentWeek ?? 1
    activeTab.value = Math.min(weeks.value, Math.max(1, target))
  },
  { immediate: true },
)
</script>

<template>
  <section class="missions">
    <header class="missions__header">
      <h2 class="missions__title">Missions</h2>
      <div v-if="showTabs" class="week-tabs" role="tablist" aria-label="Event weeks">
        <button
          v-for="w in weekList"
          :key="w.n"
          type="button"
          role="tab"
          class="week-tab"
          :class="{ 'week-tab--active': w.n === activeTab, 'week-tab--locked': w.locked }"
          :aria-selected="w.n === activeTab"
          @click="activeTab = w.n"
        >
          Week {{ w.n }}
          <svg v-if="w.locked" class="week-tab__lock" width="11" height="11" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <svg v-else-if="w.complete" class="week-tab__check" width="13" height="13" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"
            aria-label="All missions complete">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </button>

        <button
          v-if="hasGlobalTab"
          type="button"
          role="tab"
          class="week-tab week-tab--all"
          :class="{ 'week-tab--active': activeTab === 'all' }"
          :aria-selected="activeTab === 'all'"
          @click="activeTab = 'all'"
        >
          All Event
        </button>
      </div>
    </header>

    <p v-if="activeWeekLocked" class="missions__disclaimer">
      Missions subject to change before release.
    </p>

    <EmptyState v-if="!visibleRows.length && !visibleCommunity.length"
      message="No missions unlocked for this week yet." />
    <div v-else class="missions__scroll" :class="{ 'missions__scroll--more': showScrollCue }">
      <div ref="listRef" class="missions__list" @scroll.passive="measureScroll">
        <div v-if="visibleRows.length" class="group">
          <div v-if="showGroupLabels" class="group__head">
            <span class="group__label">Personal</span>
          </div>
          <EventMissionRow
            v-for="row in visibleRows"
            :key="row.mission.id"
            :mission="row.mission"
            :lock="row.lock"
          />
        </div>

        <div v-if="visibleCommunity.length" class="group">
          <div v-if="showGroupLabels || joinPrompt" class="group__head">
            <span v-if="showGroupLabels" class="group__label">Community</span>
            <span v-if="showGroupLabels" class="group__note">
              Optional, only personal missions unlock the next week.
            </span>
            <span v-if="joinPrompt" class="group__join">Join the event to contribute.</span>
          </div>
          <CommunityMissionRow
            v-for="mission in visibleCommunity"
            :key="mission.id"
            :mission="mission"
            :locked="communityLocked(mission)"
            :now="now"
            @contributors="openId = mission.id"
          />
        </div>
      </div>
    </div>

    <CommunityContributorsModal
      v-if="openMission"
      :mission="openMission"
      @close="openId = null"
      @navigate="openId = null"
    />
  </section>
</template>

<style scoped>
.missions {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.missions__header {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.missions__title {
  margin: 0;
  font-size: 1.6rem;
  font-weight: 700;
  letter-spacing: -0.015em;
  color: var(--text-primary);
}

.week-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0 var(--space-md);
  border-bottom: 1px solid var(--bg-overlay);
}

.week-tab {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 0 0 var(--space-sm);
  margin-bottom: -1px;
  border: none;
  border-bottom: 2px solid transparent;
  background: none;
  color: var(--text-secondary);
  font-family: var(--font-sans);
  font-size: var(--text-body);
  font-weight: 600;
  cursor: pointer;
  transition: color 120ms ease, border-color 120ms ease;
}

.week-tab:hover {
  color: var(--text-primary);
}

.week-tab--active {
  color: var(--text-primary);
  border-bottom-color: var(--page-accent, var(--accent));
}

.week-tab--locked {
  color: var(--text-tertiary);
}

.week-tab--locked.week-tab--active {
  color: var(--text-secondary);
}

.week-tab__lock {
  flex-shrink: 0;
}

.week-tab__check {
  flex-shrink: 0;
  color: var(--success);
}

.week-tab--all {
  margin-left: auto;
}

.group {
  display: flex;
  flex-direction: column;
}

.group + .group {
  border-top: 1px solid var(--bg-overlay);
}

.group__head {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: var(--space-sm);
  padding-top: var(--space-md);
}

.group__label {
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--text-secondary);
}

.group__note {
  font-size: 0.8rem;
  color: var(--text-tertiary);
}

.group__join {
  font-size: 0.8rem;
  font-style: italic;
  color: var(--warning);
}

.missions__disclaimer {
  margin: calc(-1 * var(--space-sm)) 0 0;
  font-size: 0.82rem;
  font-style: italic;
  color: var(--text-tertiary);
}

.missions__scroll {
  --mission-row-h: 117px;
  --mission-scrollbar-w: 5px;
  position: relative;
}

.missions__scroll::after {
  content: '';
  position: absolute;
  inset: auto var(--mission-scrollbar-w) 0 0;
  height: 52px;
  background: linear-gradient(to top, var(--bg-base), transparent);
  opacity: 0;
  pointer-events: none;
  transition: opacity 150ms ease-out;
}

.missions__scroll--more::after {
  opacity: 1;
}

.missions__list {
  display: flex;
  flex-direction: column;
  max-height: min(calc(var(--mission-row-h) * 5), 62vh);
  overflow-y: auto;
  padding-right: var(--space-sm);
  scrollbar-gutter: stable;
  scrollbar-width: thin;
  scrollbar-color: var(--bg-overlay) transparent;
}

.missions__list::-webkit-scrollbar {
  width: var(--mission-scrollbar-w);
}

.missions__list::-webkit-scrollbar-thumb {
  background: var(--bg-overlay);
  border-radius: 3px;
}

@media (prefers-reduced-motion: reduce) {
  .missions__scroll::after {
    transition: none;
  }
}
</style>
