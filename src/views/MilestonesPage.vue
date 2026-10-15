<script setup lang="ts">
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import MilestoneCanvas from '@/views/milestones/MilestoneCanvas.vue'
import MilestoneDetail from '@/components/domain/MilestoneDetail.vue'
import MilestoneListView from '@/components/domain/MilestoneListView.vue'
import MilestoneRewards from '@/views/milestones/MilestoneRewards.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import { useMediaQuery } from '@/composables/useMediaQuery'
import { usePageMeta } from '@/composables/usePageMeta'
import { useSetGroups } from '@/composables/useSetGroups'
import { useSupporter } from '@/composables/useSupporter'
import { useAuthStore } from '@/stores/auth'
import { useCategoryStore } from '@/stores/categories'
import type {
  MilestoneCompletionResponse,
  MilestoneSetResponse,
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
const viewMode = ref<'map' | 'list'>('map')
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

const selectedMilestone = computed(() =>
  selectedId.value ? (milestones.value.find((m) => m.milestoneId === selectedId.value) ?? null) : null,
)

const selectedSet = computed(() =>
  selectedSetId.value ? (sets.value.find((s) => s.id === selectedSetId.value) ?? null) : null,
)

const selectedSetStats = computed(() => {
  const set = selectedSet.value
  if (!set) return null
  const items = milestones.value.filter((m) => m.setId === set.id)
  return { total: items.length, completed: items.filter((m) => m.userCompleted).length }
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
  <div class="milestones-page">
    <header class="milestones-page__header">
      <h1 class="milestones-page__title">Milestones</h1>
      <div class="milestones-page__controls">
        <p v-if="!loading" class="milestones-page__summary">
          <template v-if="authStore.isLoggedIn">
            {{ totalCompleted }} of {{ milestones.length }} complete across {{ sets.length }} sets.
          </template>
          <template v-else>
            {{ milestones.length }} milestones across {{ sets.length }} sets.
          </template>
        </p>
        <div v-if="!isMobile" class="milestones-page__view-toggle">
          <button
            type="button"
            class="milestones-page__view-btn"
            :class="{ 'milestones-page__view-btn--active': viewMode === 'map' }"
            @click="viewMode = 'map'"
          >
            Map
          </button>
          <button
            type="button"
            class="milestones-page__view-btn"
            :class="{ 'milestones-page__view-btn--active': viewMode === 'list' }"
            @click="viewMode = 'list'"
          >
            List
          </button>
        </div>
      </div>
    </header>

    <div v-if="loading" class="milestones-page__skeleton">
      <SkeletonLoader variant="card" />
      <SkeletonLoader variant="card" />
    </div>

    <div v-else-if="viewMode === 'map' && !isMobile" class="milestones-page__map">
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

      <aside class="milestones-page__inspector" aria-label="Milestone details">
        <Transition name="inspector" mode="out-in">
          <div :key="selectedId ?? selectedSetId ?? 'hint'" class="milestones-page__inspector-content">
            <template v-if="selectedMilestone">
              <MilestoneDetail :milestone="selectedMilestone" :logged-in="authStore.isLoggedIn" />
              <MilestoneRewards :rewards="selectedMilestone.rewards ?? []" />

              <div v-if="authStore.isLoggedIn && selectedMilestone.userCompleted" class="milestones-page__pin">
                <BaseButton size="sm" :disabled="!canPin || pinPending" @click="togglePin">
                  {{ selectedIsPinned ? 'Unpin from profile' : 'Pin to profile' }}
                </BaseButton>
                <span class="milestones-page__pin-count">{{ pinned.length }} / {{ pinSlotLimit }} pinned</span>
                <p v-if="pinFullNotice" class="milestones-page__pin-notice">{{ pinFullNotice }}</p>
                <p v-if="pinError" class="milestones-page__pin-notice milestones-page__pin-notice--error">
                  {{ pinError }}
                </p>
              </div>
            </template>

            <template v-else-if="selectedSet && selectedSetStats">
              <div class="milestones-page__set">
                <h2 class="section-title">{{ selectedSet.title }}</h2>
                <p class="milestones-page__set-desc">{{ selectedSet.description }}</p>
                <p class="milestones-page__set-meta">
                  <template v-if="authStore.isLoggedIn">
                    {{ selectedSetStats.completed }} / {{ selectedSetStats.total }} complete
                  </template>
                  <template v-else>{{ selectedSetStats.total }} milestones</template>
                  <template v-if="selectedSet.setBonusXp > 0">
                    · +{{ selectedSet.setBonusXp }} XP for finishing the set
                  </template>
                </p>
              </div>
              <MilestoneRewards
                :rewards="selectedSet.rewards ?? []"
                label="Set reward"
                ceremonial
              />
            </template>

            <p v-else class="milestones-page__hint">Pick a milestone.</p>
          </div>
        </Transition>
      </aside>
    </div>

    <MilestoneListView
      v-else
      :milestones="milestones"
      :sets="sets"
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
  gap: var(--space-xl);
  max-width: min(1720px, 96vw);
  margin: 0 auto;
  width: 100%;
  min-height: 80vh;
  padding: var(--space-lg);
}

.milestones-page__header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--space-md);
}

.milestones-page__controls {
  display: flex;
  align-items: center;
  gap: var(--space-lg);
}

.milestones-page__summary {
  margin: 0;
  font-size: var(--text-body);
  color: var(--text-secondary);
}

.milestones-page__view-toggle {
  display: flex;
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-btn);
  overflow: hidden;
}

.milestones-page__view-btn {
  padding: var(--space-xs) var(--space-md);
  background: none;
  border: none;
  color: var(--text-tertiary);
  font-family: var(--font-sans);
  font-size: var(--text-caption);
  cursor: pointer;
  transition: color 120ms ease, background-color 120ms ease;
}

.milestones-page__view-btn:hover {
  color: var(--text-primary);
  background: var(--bg-elevated);
}

.milestones-page__view-btn--active {
  color: var(--page-accent, var(--accent));
  background: color-mix(in srgb, var(--page-accent, var(--accent)) 10%, transparent);
}

.milestones-page__skeleton {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-lg);
}

.milestones-page__map {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: var(--space-lg);
  align-items: start;
}

.milestones-page__inspector {
  position: sticky;
  top: calc(64px + var(--space-lg));
}

.milestones-page__inspector-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.inspector-enter-active,
.inspector-leave-active {
  transition: opacity 150ms ease-out;
}

.inspector-enter-from,
.inspector-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .inspector-enter-active,
  .inspector-leave-active {
    transition: none;
  }
}

.milestones-page__set {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  padding: var(--space-md);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  background: var(--bg-surface);
}

.milestones-page__set-desc {
  margin: 0;
  font-size: var(--text-body);
  color: var(--text-secondary);
  line-height: 1.5;
}

.milestones-page__set-meta {
  margin: 0;
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--text-tertiary);
}

.milestones-page__pin {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-sm);
}

.milestones-page__pin-count {
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--text-tertiary);
}

.milestones-page__pin-notice {
  flex-basis: 100%;
  margin: 0;
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

.milestones-page__pin-notice--error {
  color: var(--error);
}

.milestones-page__hint {
  margin: 0;
  font-size: var(--text-body);
  color: var(--text-tertiary);
}

@media (max-width: 1023px) {
  .milestones-page__map {
    grid-template-columns: minmax(0, 1fr);
  }

  .milestones-page__inspector {
    position: static;
  }
}

@media (max-width: 767px) {
  .milestones-page__header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
