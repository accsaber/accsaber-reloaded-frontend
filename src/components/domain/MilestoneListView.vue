<script setup lang="ts">
import type { MilestoneSort } from '@/types/api/milestones'
import BaseSelect from '@/components/common/BaseSelect.vue'
import BaseTabs from '@/components/common/BaseTabs.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import MilestoneDetail from '@/components/domain/MilestoneDetail.vue'
import type { MilestoneCompletionResponse, MilestoneSetResponse } from '@/types/api/milestones'
import type { Tab } from '@/types/display'
import type { ResolvedSetGroup } from '@/types/milestones'
import { computed, ref } from 'vue'

const props = defineProps<{
  milestones: MilestoneCompletionResponse[]
  sets: MilestoneSetResponse[]
  loading?: boolean
  loggedIn?: boolean
  groups?: ResolvedSetGroup[]
  standaloneSets?: MilestoneSetResponse[]
  pinnable?: boolean
  pinnedIds?: Set<string>
  canPinMore?: boolean
  pinPending?: Set<string>
}>()

const emit = defineEmits<{ 'pin-toggle': [milestoneId: string] }>()

function isPinned(id: string): boolean {
  return props.pinnedIds?.has(id) ?? false
}

function pinDisabled(id: string): boolean {
  return !isPinned(id) && props.canPinMore === false
}

const expandedSets = ref<Set<string>>(new Set())
const viewMode = ref('all')
const activeSort = ref<MilestoneSort>('tier')

const sortOptions = computed(() => {
  const options = [
    { value: 'tier', label: 'Tier' },
    { value: 'completions', label: 'Most Completed' },
  ]
  if (props.loggedIn) {
    options.push({ value: 'completedAt', label: 'Recently Completed' })
    options.push({ value: 'progress', label: 'Progress' })
  }
  return options
})

const viewTabs = computed<Tab[]>(() => [
  { key: 'all', label: 'All Progress' },
  { key: 'completed', label: props.loggedIn ? `Completed ${completedMilestones.value.length}` : 'Completed' },
])

interface MilestoneGroup {
  setId: string
  setTitle: string
  setBonusXp: number
  completedCount: number
  totalCount: number
  milestones: MilestoneCompletionResponse[]
}

const completedMilestones = computed(() =>
  props.milestones.filter((m) => m.userCompleted === true),
)

const SORTS: Record<Exclude<MilestoneSort, 'tier'>, (a: MilestoneCompletionResponse, b: MilestoneCompletionResponse) => number> = {
  completions: (a, b) => b.completions - a.completions,
  completedAt: (a, b) => (b.userCompletedAt ?? '').localeCompare(a.userCompletedAt ?? ''),
  progress: (a, b) =>
    Number(!!a.userCompleted) - Number(!!b.userCompleted) ||
    (b.userNormalizedProgress ?? 0) - (a.userNormalizedProgress ?? 0),
}

const activeMilestones = computed(() => {
  const base = viewMode.value === 'completed' ? completedMilestones.value : props.milestones
  return activeSort.value === 'tier' ? base : [...base].sort(SORTS[activeSort.value])
})

const isFlatSort = computed(() => activeSort.value !== 'tier')

function buildMilestoneGroup(setId: string, setInfo: MilestoneSetResponse | undefined, milestones: MilestoneCompletionResponse[]): MilestoneGroup {
  return {
    setId,
    setTitle: setInfo?.title ?? 'Other',
    setBonusXp: setInfo?.setBonusXp ?? 0,
    completedCount: milestones.filter((m) => m.userCompleted === true).length,
    totalCount: milestones.length,
    milestones,
  }
}

const milestonesBySetId = computed(() => {
  const map = new Map<string, MilestoneCompletionResponse[]>()
  for (const m of activeMilestones.value) {
    const key = m.setId || 'uncategorized'
    const list = map.get(key)
    if (list) list.push(m)
    else map.set(key, [m])
  }
  return map
})

const setMap = computed(() => new Map(props.sets.map((s) => [s.id, s])))

interface DisplayGroup {
  groupId: string
  groupName: string
  groupDescription: string
  sets: MilestoneGroup[]
}

function buildDisplayGroup(groupId: string, groupName: string, groupDescription: string, groupSets: MilestoneSetResponse[]): DisplayGroup {
  return {
    groupId,
    groupName,
    groupDescription,
    sets: groupSets
      .map((s) => buildMilestoneGroup(s.id, setMap.value.get(s.id), milestonesBySetId.value.get(s.id) ?? []))
      .filter((g) => g.totalCount > 0),
  }
}

const displayGroups = computed<DisplayGroup[]>(() => {
  if (!props.groups?.length) {
    const sets = [...milestonesBySetId.value].map(([setId, items]) => buildMilestoneGroup(setId, setMap.value.get(setId), items))
    return sets.length ? [{ groupId: 'all', groupName: '', groupDescription: '', sets }] : []
  }
  return [
    ...props.groups.map((rg) => buildDisplayGroup(rg.group.id, rg.group.name, rg.group.description, rg.sets)),
    buildDisplayGroup('standalone', 'Other', '', props.standaloneSets ?? []),
  ].filter((dg) => dg.sets.length > 0)
})

function toggleSet(setId: string) {
  if (expandedSets.value.has(setId)) {
    expandedSets.value.delete(setId)
  } else {
    expandedSets.value.add(setId)
  }
}
</script>

<template>
  <div class="milestone-list-view">
    <div class="milestone-list-view__controls">
      <BaseTabs class="milestone-list-view__tabs" :tabs="viewTabs" :model-value="viewMode"
        @update:model-value="viewMode = $event" />
      <BaseSelect :model-value="activeSort" :options="sortOptions"
        @update:model-value="activeSort = $event as MilestoneSort" />
    </div>

    <div v-if="loading" class="milestone-group">
      <SkeletonLoader v-for="i in 8" :key="i" variant="text" height="24px" class="milestone-list-view__skeleton" />
    </div>

    <div v-else-if="viewMode === 'completed' && !loggedIn" class="milestone-list-view__login-hint">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
      <p>Log in to track milestone progress</p>
    </div>

    <p v-else-if="displayGroups.length === 0" class="milestone-list-view__empty">
      {{ viewMode === 'completed' ? 'No completed milestones yet' : 'No milestone progress found' }}
    </p>

    <template v-else-if="isFlatSort">
      <div class="milestone-set__rows milestone-set__rows--flat stagger" :style="{ '--n': activeMilestones.length }">
        <MilestoneDetail v-for="(m, i) in activeMilestones" :key="m.milestoneId" :style="{ '--i': i }"
          :milestone="m" :logged-in="loggedIn"
          :pinnable="pinnable" :pinned="isPinned(m.milestoneId)"
          :pin-disabled="pinDisabled(m.milestoneId)" :pin-pending="pinPending?.has(m.milestoneId)"
          compact @pin-toggle="emit('pin-toggle', $event)" />
      </div>
    </template>

    <template v-else>
      <div v-for="dg in displayGroups" :key="dg.groupId" class="milestone-group">
        <div v-if="dg.groupName">
          <h2 class="section-title">{{ dg.groupName }}</h2>
          <p v-if="dg.groupDescription" class="milestone-group__desc">{{ dg.groupDescription }}</p>
        </div>

        <div class="milestone-group__sets">
          <div v-for="ms in dg.sets" :key="ms.setId" class="milestone-set">
            <button class="milestone-set__header" :aria-expanded="expandedSets.has(ms.setId)"
              @click="toggleSet(ms.setId)">
              <h3 class="milestone-set__title card-title">{{ ms.setTitle }}</h3>
              <span class="milestone-set__count">
                {{ loggedIn ? `${ms.completedCount} of ${ms.totalCount}` : `${ms.totalCount} milestones` }}
              </span>
              <span v-if="loggedIn" class="milestone-set__bar" aria-hidden="true">
                <span class="milestone-set__bar-fill"
                  :style="{ transform: `scaleX(${ms.completedCount / ms.totalCount})` }" />
              </span>
              <span v-if="ms.setBonusXp > 0" class="milestone-set__bonus">+{{ ms.setBonusXp }} XP</span>
              <svg class="milestone-set__chevron"
                :class="{ 'milestone-set__chevron--open': expandedSets.has(ms.setId) }" viewBox="0 0 20 20"
                fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                aria-hidden="true">
                <polyline points="6 8 10 12 14 8" />
              </svg>
            </button>

            <Transition name="collapse">
              <div v-if="expandedSets.has(ms.setId)" class="milestone-set__body">
                <div class="milestone-set__rows stagger" :style="{ '--n': ms.milestones.length }">
                  <MilestoneDetail v-for="(m, i) in ms.milestones" :key="m.milestoneId" :style="{ '--i': i }"
                    :milestone="m"
                    :logged-in="loggedIn" :pinnable="pinnable" :pinned="isPinned(m.milestoneId)"
                    :pin-disabled="pinDisabled(m.milestoneId)" :pin-pending="pinPending?.has(m.milestoneId)"
                    compact @pin-toggle="emit('pin-toggle', $event)" />
                </div>
              </div>
            </Transition>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.milestone-list-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.milestone-list-view__controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
}

.milestone-list-view__tabs {
  flex: none;
}

.milestone-list-view__empty {
  padding: var(--space-3xl) var(--space-md);
  text-align: center;
  color: var(--text-secondary);
  margin: 0;
}

.milestone-list-view__login-hint {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-3xl) var(--space-md);
  color: var(--text-secondary);
  text-align: center;
}

.milestone-list-view__login-hint p {
  margin: 0;
  font-size: var(--text-body);
  max-width: 320px;
}

.milestone-list-view__skeleton {
  margin: var(--space-md) 0;
}

.milestone-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.milestone-group__desc {
  font-size: var(--text-caption);
  color: var(--text-secondary);
  margin: var(--space-xs) 0 0;
}

.milestone-group__sets {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.milestone-set__header {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  width: 100%;
  padding: var(--space-md);
  border: none;
  border-radius: var(--radius-card);
  background: var(--bg-surface);
  cursor: pointer;
  text-align: left;
  font-family: var(--font-sans);
  transition: background-color var(--dur-fast) var(--ease-out);
}

.milestone-set__header:hover {
  background: var(--bg-elevated);
}

.milestone-set__count {
  flex: 1;
  font-size: var(--text-caption);
  color: var(--text-secondary);
  font-family: var(--font-mono);
}

.milestone-set__bar {
  width: 120px;
  height: 2px;
  background: var(--bg-overlay);
  overflow: hidden;
}

.milestone-set__bar-fill {
  display: block;
  height: 100%;
  background: var(--page-accent, var(--accent));
  transform-origin: left;
}

.milestone-set__bonus {
  min-width: 88px;
  text-align: right;
  font-size: var(--text-caption);
  color: var(--text-secondary);
  font-family: var(--font-mono);
}

.milestone-set__chevron {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  color: var(--text-secondary);
  transition: transform var(--dur-fast) var(--ease-in-out);
}

.milestone-set__chevron--open {
  transform: rotate(180deg);
}

.milestone-set__body {
  display: grid;
  grid-template-rows: 1fr;
}

.milestone-set__rows {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  min-height: 0;
  overflow: hidden;
  padding: 0 var(--space-md);
}

.milestone-set__rows > :last-child {
  margin-bottom: var(--space-md);
}

.milestone-set__rows--flat {
  padding: 0;
  gap: var(--space-sm);
  overflow: visible;
}

.milestone-set__rows--flat > :last-child {
  margin-bottom: 0;
}

@media (max-width: 767px) {
  .milestone-set__bar {
    display: none;
  }

  .milestone-set__bonus {
    min-width: 0;
  }
}
</style>
