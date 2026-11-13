<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import BaseTabs from '@/components/common/BaseTabs.vue'
import MilestoneListControls from '@/components/domain/MilestoneListControls.vue'
import MilestoneListView from '@/components/domain/MilestoneListView.vue'
import ProgressStat from '@/components/domain/ProgressStat.vue'
import MilestoneCanvas from '@/views/milestones/MilestoneCanvas.vue'
import MilestoneInspector, { type MilestoneIndexEntry } from '@/views/milestones/MilestoneInspector.vue'
import { useMediaQuery } from '@/composables/useMediaQuery'
import { usePageMeta } from '@/composables/usePageMeta'
import { useSetGroups } from '@/composables/useSetGroups'
import { useSupporter } from '@/composables/useSupporter'
import { useAuthStore } from '@/stores/auth'
import { useCategoryStore } from '@/stores/categories'
import type {
  MilestoneCompletionResponse,
  MilestoneSetResponse,
  MilestoneSort,
  PrerequisiteLinkResponse,
} from '@/types/api/milestones'
import type { UserMilestoneProgressResponse } from '@/types/api/users'
import type { MilestoneDisplay } from '@/types/display'
import { toMilestoneDisplay } from '@/utils/mappers'
import { STANDARD_PIN_SLOTS, SUPPORTER_PIN_SLOTS } from '@/utils/constants'
import type { MilestoneSetGroup } from '@/utils/milestoneLayout'
import { computed, onMounted, ref, watch } from 'vue'
import { parseApiError } from '@/api/client'

const authStore = useAuthStore()
const categoryStore = useCategoryStore()

const loading = ref(true)
const sets = ref<MilestoneSetResponse[]>([])
const milestones = ref<MilestoneCompletionResponse[]>([])
const prerequisites = ref<PrerequisiteLinkResponse[]>([])
const isMobile = useMediaQuery('(max-width: 767px)')
const viewMode = ref('map')
const filter = ref('all')
const sort = ref<MilestoneSort>('tier')

const VIEW_TABS = [
  { key: 'map', label: 'Map' },
  { key: 'list', label: 'List' },
]

const showMap = computed(() => viewMode.value === 'map' && !isMobile.value)
const selectedId = ref<string | null>(null)
const selectedSetId = ref<string | null>(null)
const focusedSetId = ref<string | null>(null)

const { resolvedGroups, standaloneSets, fetchGroups } = useSetGroups(sets)

usePageMeta({
  title: 'Milestones | AccSaber',
  description: 'Track your milestone progress and earn XP across AccSaber achievement sets.',
})

const mapGroups = computed<MilestoneSetGroup[]>(() => {
  const bands: MilestoneSetGroup[] = resolvedGroups.value.map((g) => ({
    id: g.group.id,
    name: g.group.name,
    setIds: g.sets.map((s) => s.id),
  }))
  if (standaloneSets.value.length > 0) {
    bands.push({
      id: 'standalone',
      name: bands.length > 0 ? 'Other' : null,
      setIds: standaloneSets.value.map((s) => s.id),
    })
  }
  return bands
})

const orderedSetIds = computed(() => mapGroups.value.flatMap((g) => g.setIds))

watch(orderedSetIds, (ids) => {
  if (focusedSetId.value && !ids.includes(focusedSetId.value)) focusedSetId.value = null
})

function focusSet(setId: string | null) {
  focusedSetId.value = setId
  selectedId.value = null
  selectedSetId.value = setId
}

const nodes = computed<MilestoneDisplay[]>(() =>
  milestones.value.map((m) =>
    toMilestoneDisplay(m, m.categoryId ? categoryStore.getCategoryCode(m.categoryId) : undefined),
  ),
)

const totalCompleted = computed(() => milestones.value.filter((m) => m.userCompleted).length)

const overview = computed(() => {
  const total = milestones.value.length
  const note = loading.value ? '\u00a0' : `${sets.value.length} sets`
  if (!authStore.isLoggedIn) return { label: 'Milestones', value: total, note }
  return {
    label: loading.value ? 'Completed' : `Completed of ${total}`,
    value: totalCompleted.value,
    ratio: total > 0 ? totalCompleted.value / total : 0,
    note,
  }
})

const selectedMilestone = computed(() =>
  selectedId.value ? (milestones.value.find((m) => m.milestoneId === selectedId.value) ?? null) : null,
)

const selectedSet = computed(() =>
  selectedSetId.value ? (sets.value.find((s) => s.id === selectedSetId.value) ?? null) : null,
)

const setStats = computed(() => {
  const out = new Map<string, { total: number; completed: number }>()
  for (const m of milestones.value) {
    const stats = out.get(m.setId) ?? { total: 0, completed: 0 }
    stats.total++
    if (m.userCompleted) stats.completed++
    out.set(m.setId, stats)
  }
  return out
})

const selectedSetStats = computed(() =>
  selectedSet.value ? (setStats.value.get(selectedSet.value.id) ?? null) : null,
)

const setIndex = computed<MilestoneIndexEntry[]>(() => {
  const titles = new Map(sets.value.map((s) => [s.id, s.title]))
  return mapGroups.value.flatMap((group) => [
    ...(group.name ? [{ key: `group-${group.id}`, heading: group.name }] : []),
    ...group.setIds.map((id) => ({
      key: id,
      title: titles.get(id) ?? '',
      ...(setStats.value.get(id) ?? { total: 0, completed: 0 }),
    })),
  ])
})

const { isSupporter } = useSupporter(() => authStore.userId)

const pinSlotLimit = computed(() => (isSupporter.value ? SUPPORTER_PIN_SLOTS : STANDARD_PIN_SLOTS))

const pinned = ref<UserMilestoneProgressResponse[]>([])
const pinSupported = ref(true)
const pinPending = ref(false)
const pinError = ref<string | null>(null)

const pinnedIds = computed(() => new Set(pinned.value.map((p) => p.milestoneId)))

const selectedIsPinned = computed(
  () => !!selectedId.value && pinnedIds.value.has(selectedId.value),
)

const canPin = computed(
  () =>
    pinSupported.value &&
    authStore.isLoggedIn &&
    !!selectedMilestone.value?.userCompleted &&
    (selectedIsPinned.value || pinned.value.length < pinSlotLimit.value),
)

const pinFullNotice = computed(() => {
  if (!authStore.isLoggedIn || !pinSupported.value) return null
  if (!selectedMilestone.value?.userCompleted) return null
  if (selectedIsPinned.value || pinned.value.length < pinSlotLimit.value) return null
  return pinSlotLimit.value === SUPPORTER_PIN_SLOTS
    ? `All ${SUPPORTER_PIN_SLOTS} pinned slots are full. Unpin one from your profile first.`
    : `All ${STANDARD_PIN_SLOTS} pinned slots are full. Supporters get ${SUPPORTER_PIN_SLOTS}.`
})

async function fetchPinned(userId: string | null) {
  if (!userId || !pinSupported.value) return []
  const { getUserPinnedMilestones } = await import('@/api/users')
  return getUserPinnedMilestones(userId).catch(() => {
    pinSupported.value = false
    return []
  })
}

async function togglePin() {
  if (!selectedId.value || pinPending.value || !canPin.value) return
  const id = selectedId.value
  const unpinning = selectedIsPinned.value
  const nextIds = unpinning
    ? pinned.value.map((p) => p.milestoneId).filter((p) => p !== id)
    : [...pinned.value.map((p) => p.milestoneId), id]

  pinPending.value = true
  pinError.value = null
  try {
    const { updateMyProfile } = await import('@/api/users')
    await updateMyProfile({
      pinnedMilestones: nextIds.map((milestoneId, displayOrder) => ({ milestoneId, displayOrder })),
    })
    if (unpinning) pinned.value = pinned.value.filter((p) => p.milestoneId !== id)
    else pinned.value = await fetchPinned(authStore.userId)
  } catch (err) {
    pinError.value = parseApiError(err, 'Could not update pins').message
  } finally {
    pinPending.value = false
  }
}

let userRequest = 0

async function fetchUserData() {
  const id = ++userRequest
  const userId = authStore.userId
  const { getMilestoneCompletionStats } = await import('@/api/milestones')
  const [completion, pins] = await Promise.all([
    getMilestoneCompletionStats(userId ?? undefined).catch(() => []),
    fetchPinned(userId),
  ])
  if (id !== userRequest) return
  milestones.value = completion
  pinned.value = pins
}

async function fetchData() {
  const { getMilestoneSets, getPrerequisites } = await import('@/api/milestones')
  const [setsRes, prereqs] = await Promise.all([
    getMilestoneSets({ size: 100 }).catch(() => null),
    getPrerequisites().catch(() => []),
    fetchGroups(),
    fetchUserData(),
  ])
  sets.value = setsRes?.content ?? []
  prerequisites.value = prereqs
  loading.value = false
}

function selectMilestone(id: string | null) {
  selectedId.value = id
  if (id) selectedSetId.value = null
}

function selectSet(setId: string) {
  selectedSetId.value = setId
  selectedId.value = null
}

onMounted(fetchData)

watch(() => authStore.userId, fetchUserData)
</script>

<template>
  <div class="milestones-page" :class="{ 'milestones-page--map': showMap }">
    <header class="milestones-page__header">
      <h1>Milestones</h1>
      <div class="milestones-page__controls">
        <MilestoneListControls v-if="!showMap" v-model:filter="filter" v-model:sort="sort"
          :logged-in="authStore.isLoggedIn" :completed-count="totalCompleted" />
        <BaseTabs v-if="!isMobile" v-model="viewMode" class="milestones-page__view" variant="segmented"
          label="View" :tabs="VIEW_TABS" />
      </div>
    </header>

    <ProgressStat v-if="!showMap" class="milestones-page__tally" v-bind="overview" />

    <div v-if="showMap" class="milestones-page__map">
      <MilestoneCanvas
        :milestones="nodes"
        :sets="sets"
        :groups="mapGroups"
        :prerequisites="prerequisites"
        :logged-in="authStore.isLoggedIn"
        :selected-id="selectedId"
        :focused-set-id="focusedSetId"
        @select="selectMilestone"
        @select-set="selectSet"
        @focus-set="focusSet"
      />

      <MilestoneInspector :milestone="selectedMilestone" :set="selectedSet" :set-stats="selectedSetStats"
        :index="setIndex" :loading="loading" :logged-in="authStore.isLoggedIn" @focus-set="focusSet">
        <template #overview>
          <ProgressStat v-bind="overview" />
        </template>
        <template v-if="authStore.isLoggedIn && selectedMilestone?.userCompleted" #actions>
          <div class="milestones-page__pin">
            <BaseButton :disabled="!canPin || pinPending" @click="togglePin">
              {{ selectedIsPinned ? 'Unpin From Profile' : 'Pin to Profile' }}
            </BaseButton>
            <span class="caption">{{ pinned.length }} / {{ pinSlotLimit }} pinned</span>
            <p v-if="pinFullNotice" class="caption">{{ pinFullNotice }}</p>
            <p v-if="pinError" class="caption milestones-page__error" role="alert">{{ pinError }}</p>
          </div>
        </template>
      </MilestoneInspector>
    </div>

    <MilestoneListView
      v-else
      v-model:filter="filter"
      v-model:sort="sort"
      hide-controls
      :milestones="milestones"
      :sets="sets"
      :loading="loading"
      :logged-in="authStore.isLoggedIn"
      :groups="resolvedGroups"
      :standalone-sets="standaloneSets"
    />
  </div>
</template>

<style scoped>
.milestones-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  max-width: 1720px;
  margin: 0 auto;
  width: 100%;
}

.milestones-page--map {
  height: calc(100svh - var(--navbar-height) - var(--space-xl) * 2);
  min-height: 560px;
}

.milestones-page__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--space-md);
  min-height: var(--control-h);
}

.milestones-page__controls {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  min-width: 0;
}

.milestones-page__view {
  flex: none;
}

.milestones-page__tally {
  max-width: 360px;
}

.milestones-page__map {
  display: grid;
  grid-template-columns: minmax(0, 1fr) clamp(280px, 26vw, 360px);
  grid-template-rows: minmax(0, 1fr);
  gap: var(--space-lg);
  flex: 1;
  min-height: 0;
}

.milestones-page__pin {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-sm);
}

.milestones-page__pin p {
  flex-basis: 100%;
}

.milestones-page__error {
  color: var(--error);
}

@media (max-width: 767px) {
  .milestones-page__controls {
    width: 100%;
  }
}
</style>
