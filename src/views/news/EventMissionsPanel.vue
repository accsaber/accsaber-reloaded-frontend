<script setup lang="ts">
import BaseTabs from '@/components/common/BaseTabs.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import type { MissionResponse } from '@/types/api/missions'
import MissionContributorsModal from '@/components/domain/MissionContributorsModal.vue'
import SharedMissionRow from '@/components/domain/SharedMissionRow.vue'
import EventMissionRow from '@/views/news/EventMissionRow.vue'
import type { Tab } from '@/types/display'
import type { PaginationParams } from '@/types/pagination'
import { missionLockState, type EventMissionView } from '@/utils/events'
import { computed, ref, watch } from 'vue'
import { clamp } from '@/utils/math'

async function loadContributors(missionId: string, params: PaginationParams) {
  const { getCommunityContributors } = await import('@/api/missions')
  return getCommunityContributors(missionId, params)
}

const props = defineProps<{
  missions: EventMissionView[]
  communityMissions: MissionResponse[]
  currentWeek: number | null
  totalWeeks: number
  unlockedWeek: number | null
  begun: boolean | null
  live: boolean
  ended: boolean
  joinPrompt: boolean
  now: number
}>()

type WeekTab = number | 'all'

const activeTab = ref<WeekTab>(1)
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
  if (props.ended) return false
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
    return { n, locked, complete: !locked && weekComplete(n) }
  }),
)

const TAB_ACCENT = 'var(--page-accent, var(--accent))'

const weekTabs = computed<Tab[]>(() => {
  const tabs: Tab[] = weekList.value.map((w) => ({
    key: String(w.n),
    label: String(w.n),
    accentColor: TAB_ACCENT,
  }))
  if (hasGlobalTab.value) tabs.push({ key: 'all', label: 'All', accentColor: TAB_ACCENT })
  return tabs
})

const weekByKey = computed(() => new Map(weekList.value.map((w) => [String(w.n), w])))

function selectTab(key: string) {
  activeTab.value = key === 'all' ? 'all' : Number(key)
}

const activeWeekLocked = computed(() => activeTab.value !== 'all' && weekLocked(activeTab.value))

const visibleRows = computed(() => {
  if (activeTab.value === 'all') return []
  const week = activeTab.value
  const filtered = showTabs.value ? props.missions.filter((m) => m.week === week) : props.missions
  return filtered.map((mission) => ({
    mission,
    lock: props.ended
      ? null
      : missionLockState(mission, {
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
  return !props.ended && activeTab.value !== 'all' && mission.unlocked === false
}

const showGroupLabels = computed(
  () => visibleRows.value.length > 0 && visibleCommunity.value.length > 0,
)

const openMission = computed(
  () => props.communityMissions.find((m) => m.id === openId.value) ?? null,
)

watch(hasGlobalTab, (has) => {
  if (!has && activeTab.value === 'all') activeTab.value = 1
})

watch(
  () => [props.totalWeeks, props.currentWeek] as const,
  () => {
    const target = props.currentWeek ?? 1
    activeTab.value = clamp(target, 1, weeks.value)
  },
  { immediate: true },
)
</script>

<template>
  <section class="missions">
    <header class="missions__header">
      <h2 class="section-title">Missions</h2>
      <div v-if="showTabs" class="missions__weeks">
        <span class="field-label">Week</span>
        <BaseTabs
          label="Event weeks"
          :tabs="weekTabs"
          :model-value="String(activeTab)"
          @update:model-value="selectTab"
        >
          <template #tab="{ tab, active }">
            <span
              :class="{
                'week-tab--locked': weekByKey.get(tab.key)?.locked,
                'week-tab--active': active,
              }"
            >
              {{ tab.label }}
            </span>
            <svg
              v-if="weekByKey.get(tab.key)?.locked"
              class="week-tab__icon"
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <svg
              v-else-if="weekByKey.get(tab.key)?.complete"
              class="week-tab__icon week-tab__check"
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.6"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-label="All missions complete"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </template>
        </BaseTabs>
      </div>
    </header>

    <p v-if="activeWeekLocked" class="caption">
      Missions subject to change before release.
    </p>

    <EmptyState
      v-if="!visibleRows.length && !visibleCommunity.length"
      message="No missions unlocked for this week yet."
    />
    <div v-else class="missions__list">
      <div v-if="visibleRows.length" class="group">
        <div v-if="showGroupLabels" class="group__head">
          <span class="field-label">Personal</span>
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
          <span v-if="showGroupLabels" class="field-label">Community</span>
          <span v-if="showGroupLabels" class="caption">Optional</span>
          <span v-if="joinPrompt" class="caption group__join">Join the event to contribute.</span>
        </div>
        <SharedMissionRow
          v-for="mission in visibleCommunity"
          :key="mission.id"
          :mission="mission"
          :locked="communityLocked(mission)"
          :now="now"
          @contributors="openId = mission.id"
        />
      </div>
    </div>

    <MissionContributorsModal
      v-if="openMission"
      :mission="openMission"
      :load-page="loadContributors"
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
  min-width: 0;
  padding: var(--space-lg);
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
}

.missions__header {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  min-width: 0;
}

.missions__weeks {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.missions__weeks :deep(.base-tabs) {
  flex: 1;
  flex-wrap: nowrap;
  gap: 0;
  min-width: 0;
}

.missions__weeks :deep(.base-tabs__tab) {
  flex: 1 1 0;
  justify-content: center;
  min-width: 0;
  padding: 0;
}

.week-tab--locked {
  color: var(--text-tertiary);
}

.week-tab--locked.week-tab--active {
  color: var(--text-secondary);
}

.week-tab__icon {
  flex-shrink: 0;
}

.week-tab__check {
  color: var(--success);
}

.group__head {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: var(--space-sm);
  padding-top: var(--space-md);
}

.group__join {
  color: var(--warning);
}

.missions__list,
.group {
  display: flex;
  flex-direction: column;
}

.missions__list {
  --scrollbar: 10px;
  gap: var(--space-lg);
  max-height: 62vh;
  margin-right: calc(-1 * var(--space-lg));
  padding-right: calc(var(--space-lg) - var(--scrollbar));
  overflow-y: auto;
  scrollbar-gutter: stable;
  scrollbar-width: thin;
  scrollbar-color: var(--bg-overlay) transparent;
}

@supports (-moz-appearance: none) {
  .missions__list {
    --scrollbar: 8px;
  }
}

@media (max-width: 959px) {
  .missions {
    padding: var(--space-md);
  }

  .missions__list {
    max-height: none;
    margin-right: 0;
    padding-right: 0;
    overflow-y: visible;
  }
}
</style>
