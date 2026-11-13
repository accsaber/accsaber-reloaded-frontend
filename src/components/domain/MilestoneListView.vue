<script setup lang="ts">
import ProgressBar from '@/components/common/ProgressBar.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import SwapList from '@/components/common/SwapList.vue'
import MilestoneListControls from '@/components/domain/MilestoneListControls.vue'
import MilestoneRow from '@/components/domain/MilestoneRow.vue'
import type { MilestoneCompletionResponse, MilestoneSetResponse, MilestoneSort } from '@/types/api/milestones'
import type { ResolvedSetGroup } from '@/types/milestones'
import { readStoredString, writeStoredString } from '@/utils/storage'
import { computed, ref, watch } from 'vue'

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
  hideControls?: boolean
}>()

const emit = defineEmits<{ 'pin-toggle': [milestoneId: string] }>()

const filter = defineModel<string>('filter', { default: 'all' })
const sort = defineModel<MilestoneSort>('sort', { default: 'tier' })

const SHAPE_KEY = 'accsaber:milestone-list-shape'
const shape = ref(readStoredString(SHAPE_KEY) ?? 'gsssgssssgsssss')

const expandedSets = ref<Set<string>>(new Set())

interface SetEntry {
  key: string
  title: string
  bonusXp: number
  completed: number
  milestones: MilestoneCompletionResponse[]
}

interface HeadingEntry {
  key: string
  heading: string
  description: string
}

type Entry = SetEntry | HeadingEntry

const completedMilestones = computed(() => props.milestones.filter((m) => m.userCompleted === true))

const SORTS: Record<Exclude<MilestoneSort, 'tier'>, (a: MilestoneCompletionResponse, b: MilestoneCompletionResponse) => number> = {
  completions: (a, b) => b.completions - a.completions,
  completedAt: (a, b) => (b.userCompletedAt ?? '').localeCompare(a.userCompletedAt ?? ''),
  progress: (a, b) =>
    Number(!!a.userCompleted) - Number(!!b.userCompleted) ||
    (b.userNormalizedProgress ?? 0) - (a.userNormalizedProgress ?? 0),
}

const activeMilestones = computed(() => {
  const base = filter.value === 'completed' ? completedMilestones.value : props.milestones
  return sort.value === 'tier' ? base : [...base].sort(SORTS[sort.value])
})

const milestonesBySetId = computed(() => {
  const map = new Map<string, MilestoneCompletionResponse[]>()
  for (const m of activeMilestones.value) {
    const list = map.get(m.setId)
    if (list) list.push(m)
    else map.set(m.setId, [m])
  }
  return map
})

function setEntries(sets: MilestoneSetResponse[]): SetEntry[] {
  return sets.flatMap((set) => {
    const milestones = milestonesBySetId.value.get(set.id) ?? []
    if (milestones.length === 0) return []
    return {
      key: set.id,
      title: set.title,
      bonusXp: set.setBonusXp,
      completed: milestones.filter((m) => m.userCompleted === true).length,
      milestones,
    }
  })
}

const entries = computed<Entry[]>(() => {
  if (!props.groups?.length) return setEntries(props.sets)
  const bands = [
    ...props.groups.map((g) => ({ id: g.group.id, name: g.group.name, description: g.group.description, sets: g.sets })),
    { id: 'standalone', name: 'Other', description: '', sets: props.standaloneSets ?? [] },
  ]
  return bands.flatMap((band) => {
    const sets = setEntries(band.sets)
    if (sets.length === 0) return []
    return [{ key: `group-${band.id}`, heading: band.name, description: band.description }, ...sets]
  })
})

watch(entries, (list) => {
  if (props.loading || list.length === 0 || filter.value !== 'all') return
  shape.value = list.map((e) => ('heading' in e ? 'g' : 's')).join('')
  writeStoredString(SHAPE_KEY, shape.value)
})

function toggleSet(setId: string) {
  if (!expandedSets.value.delete(setId)) expandedSets.value.add(setId)
}

function pinDisabled(id: string): boolean {
  return !props.pinnedIds?.has(id) && props.canPinMore === false
}
</script>

<template>
  <div class="milestone-list">
    <div v-if="!hideControls" class="milestone-list__controls">
      <MilestoneListControls v-model:filter="filter" v-model:sort="sort" :logged-in="loggedIn"
        :completed-count="completedMilestones.length" />
    </div>

    <p v-if="!loading && activeMilestones.length === 0" class="caption milestone-list__empty">
      {{ filter === 'completed' ? 'No completed milestones yet' : 'No milestones found' }}
    </p>

    <div v-else-if="sort !== 'tier'" class="milestone-list__rows milestone-list__surface stagger"
      :style="{ '--n': activeMilestones.length }">
      <MilestoneRow v-for="(m, i) in activeMilestones" :key="m.milestoneId" :style="{ '--i': i }" :milestone="m"
        :logged-in="loggedIn" :pinnable="pinnable" :pinned="pinnedIds?.has(m.milestoneId)"
        :pin-disabled="pinDisabled(m.milestoneId)" :pin-pending="pinPending?.has(m.milestoneId)"
        @pin-toggle="emit('pin-toggle', $event)" />
    </div>

    <SwapList v-else class="milestone-list__sets" :items="entries" :item-key="(e) => e.key" :loading="loading"
      :placeholders="shape.length">
      <template #placeholder="{ index }">
        <div v-if="shape[index] === 'g'" class="milestone-list__heading placeholder">
          <SkeletonLoader width="160px" height="24px" />
        </div>
        <SkeletonLoader v-else class="placeholder" height="56px" />
      </template>

      <template #default="{ item, swap }">
        <div v-if="'heading' in item" class="milestone-list__heading" v-bind="swap">
          <h2 class="section-title">{{ item.heading }}</h2>
          <p v-if="item.description" class="caption">{{ item.description }}</p>
        </div>

        <div v-else class="milestone-list__surface" v-bind="swap">
          <button type="button" class="milestone-list__set" :aria-expanded="expandedSets.has(item.key)"
            @click="toggleSet(item.key)">
            <span class="milestone-list__set-name">
              <span class="card-title">{{ item.title }}</span>
              <span class="caption">
                {{ loggedIn ? `${item.completed} of ${item.milestones.length}` : `${item.milestones.length} milestones` }}
              </span>
            </span>
            <span v-if="loggedIn" class="milestone-list__set-bar">
              <ProgressBar :value="item.completed / item.milestones.length" />
            </span>
            <span class="caption milestone-list__set-bonus">
              {{ item.bonusXp > 0 ? `+${item.bonusXp.toLocaleString()} XP` : '' }}
            </span>
            <svg class="milestone-list__chevron"
              :class="{ 'milestone-list__chevron--open': expandedSets.has(item.key) }" width="16" height="16"
              viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
              stroke-linejoin="round" aria-hidden="true">
              <polyline points="6 8 10 12 14 8" />
            </svg>
          </button>

          <Transition name="collapse">
            <div v-if="expandedSets.has(item.key)" class="collapsible">
              <div class="milestone-list__rows stagger" :style="{ '--n': item.milestones.length }">
                <MilestoneRow v-for="(m, i) in item.milestones" :key="m.milestoneId" :style="{ '--i': i }"
                  :milestone="m" :logged-in="loggedIn" :pinnable="pinnable" :pinned="pinnedIds?.has(m.milestoneId)"
                  :pin-disabled="pinDisabled(m.milestoneId)" :pin-pending="pinPending?.has(m.milestoneId)"
                  @pin-toggle="emit('pin-toggle', $event)" />
              </div>
            </div>
          </Transition>
        </div>
      </template>
    </SwapList>
  </div>
</template>

<style scoped>
.milestone-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.milestone-list__controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
}

.milestone-list__empty {
  padding: var(--space-3xl) var(--space-md);
  text-align: center;
}

.milestone-list__sets {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.milestone-list__heading {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: var(--space-xs);
  min-height: 52px;
  margin-bottom: var(--space-xs);
}

.milestone-list__heading:not(:first-child) {
  margin-top: var(--space-lg);
}

.milestone-list__surface {
  background: var(--bg-surface);
  border-radius: var(--radius-card);
}

.milestone-list__set {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 88px 16px;
  align-items: center;
  gap: var(--space-md);
  width: 100%;
  height: 56px;
  padding: 0 var(--space-md);
  border: none;
  border-radius: var(--radius-card);
  background: none;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition: background-color var(--dur-fast) var(--ease-out);
}

.milestone-list__set:has(.milestone-list__set-bar) {
  grid-template-columns: minmax(0, 1fr) 120px 88px 16px;
}

.milestone-list__set:hover {
  background: var(--bg-elevated);
}

.milestone-list__set-name {
  display: flex;
  align-items: baseline;
  gap: var(--space-md);
  min-width: 0;
}

.milestone-list__set-name > * {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.milestone-list__set-name .caption {
  flex: none;
}

.milestone-list__set-bar {
  display: flex;
  --bar-height: 2px;
}

.milestone-list__set-bonus {
  text-align: right;
}

.milestone-list__chevron {
  color: var(--text-secondary);
  transition: transform var(--dur-fast) var(--ease-in-out);
}

.milestone-list__chevron--open {
  transform: rotate(180deg);
}

.milestone-list__rows {
  display: flex;
  flex-direction: column;
  padding: var(--space-xs);
}

@media (max-width: 767px) {
  .milestone-list__set:has(.milestone-list__set-bar) {
    grid-template-columns: minmax(0, 1fr) 88px 16px;
  }

  .milestone-list__set-bar {
    display: none;
  }

  .milestone-list__heading {
    justify-content: flex-start;
    min-height: 70px;
  }

  .milestone-list__set-name {
    flex-direction: column;
    gap: 0;
  }
}
</style>
