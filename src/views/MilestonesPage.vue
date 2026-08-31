<script setup lang="ts">
import type { MilestoneSort } from '@/api/milestones'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import MilestoneCanvas from '@/components/domain/MilestoneCanvas.vue'
import MilestoneDetail from '@/components/domain/MilestoneDetail.vue'
import MilestoneListView from '@/components/domain/MilestoneListView.vue'
import MilestoneRewards from '@/components/domain/MilestoneRewards.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import { usePageMeta } from '@/composables/usePageMeta'
import { useSetGroups } from '@/composables/useSetGroups'
import { useSupporter } from '@/composables/useSupporter'
import { useAuthStore } from '@/stores/auth'
import { useCategoryStore } from '@/stores/categories'
import type {
  MilestoneCompletionResponse,
  MilestoneResponse,
  MilestoneSetResponse,
  PrerequisiteLinkResponse,
} from '@/types/api/milestones'
import type { UserMilestoneProgressResponse } from '@/types/api/users'
import type { MilestoneDisplay } from '@/types/display'
import { toMilestoneDisplayFromCatalog } from '@/utils/mappers'
import { STANDARD_PIN_SLOTS, SUPPORTER_PIN_SLOTS } from '@/utils/constants'
import type { MilestoneSetGroup } from '@/utils/milestoneLayout'
import { glyphMapOf, loadMilestoneCatalog } from '@/composables/useMilestoneCatalog'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

const authStore = useAuthStore()
const categoryStore = useCategoryStore()

const loading = ref(true)
const sets = ref<MilestoneSetResponse[]>([])
const catalog = ref<MilestoneResponse[]>([])
const milestones = ref<MilestoneCompletionResponse[]>([])
const prerequisites = ref<PrerequisiteLinkResponse[]>([])
const milestoneSort = ref<MilestoneSort>('tier')
const isMobile = ref(false)
const viewMode = ref<'map' | 'list'>('map')
const selectedId = ref<string | null>(null)
const selectedSetId = ref<string | null>(null)
const focusedSetId = ref<string | null>(null)

const { resolvedGroups, standaloneSets, fetchGroups, resetGroups } = useSetGroups(sets)

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

const completionById = computed(() => {
  const map = new Map<string, MilestoneCompletionResponse>()
  for (const m of milestones.value) map.set(m.milestoneId, m)
  return map
})

const nodes = computed<MilestoneDisplay[]>(() =>
  catalog.value.map((m) =>
    toMilestoneDisplayFromCatalog(
      m,
      m.categoryId ? categoryStore.getCategoryCode(m.categoryId) : undefined,
      completionById.value.get(m.id),
    ),
  ),
)

const totalMilestones = computed(() => catalog.value.length)

const totalCompleted = computed(
  () => milestones.value.filter((m) => m.userCompleted).length,
)

const selectedMilestone = computed(() =>
  selectedId.value ? (completionById.value.get(selectedId.value) ?? null) : null,
)

const selectedCatalogEntry = computed(() =>
  selectedId.value ? (catalog.value.find((m) => m.id === selectedId.value) ?? null) : null,
)

const selectedRewards = computed(() => selectedCatalogEntry.value?.rewards ?? [])

const glyphs = computed(() => glyphMapOf(catalog.value))

const selectedGlyph = computed(() =>
  selectedId.value ? glyphs.value.get(selectedId.value) : undefined,
)

const selectedSet = computed(() =>
  selectedSetId.value ? (sets.value.find((s) => s.id === selectedSetId.value) ?? null) : null,
)

const selectedSetStats = computed(() => {
  const set = selectedSet.value
  if (!set) return null
  const items = catalog.value.filter((m) => m.setId === set.id)
  const done = items.filter((m) => completionById.value.get(m.id)?.userCompleted).length
  return { total: items.length, completed: done }
})

const { isSupporter } = useSupporter(() => authStore.userId)

const pinSlotLimit = computed(() => (isSupporter.value ? SUPPORTER_PIN_SLOTS : STANDARD_PIN_SLOTS))

const pinned = ref<UserMilestoneProgressResponse[]>([])
const pinSupported = ref(true)
const pinPending = ref(false)

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

async function fetchPinned() {
  if (!authStore.userId || !pinSupported.value) return
  try {
    const { getUserPinnedMilestones } = await import('@/api/users')
    pinned.value = await getUserPinnedMilestones(authStore.userId)
  } catch {
    pinned.value = []
    pinSupported.value = false
  }
}

async function togglePin() {
  if (!selectedId.value || pinPending.value || !canPin.value) return
  const id = selectedId.value
  const nextIds = selectedIsPinned.value
    ? pinned.value.map((p) => p.milestoneId).filter((p) => p !== id)
    : [...pinned.value.map((p) => p.milestoneId), id]

  pinPending.value = true
  try {
    const { updateMyProfile } = await import('@/api/users')
    await updateMyProfile({
      pinnedMilestones: nextIds.map((milestoneId, displayOrder) => ({ milestoneId, displayOrder })),
    })
    await fetchPinned()
  } catch {
  } finally {
    pinPending.value = false
  }
}

async function fetchData() {
  loading.value = true
  try {
    const { getMilestoneSets, getMilestoneCompletionStats } = await import('@/api/milestones')
    const [catalogRes, setsRes, completionRes] = await Promise.all([
      loadMilestoneCatalog(),
      getMilestoneSets({ userId: authStore.userId ?? undefined, size: 100 }),
      getMilestoneCompletionStats(authStore.userId ?? undefined, milestoneSort.value),
    ])
    catalog.value = catalogRes
    sets.value = setsRes.content
    milestones.value = completionRes

    await fetchGroups()
    await fetchPrerequisites(setsRes.content)
    await fetchPinned()
  } catch {
    catalog.value = []
    sets.value = []
    milestones.value = []
    prerequisites.value = []
    resetGroups()
  }
  loading.value = false
}

async function fetchPrerequisites(allSets: MilestoneSetResponse[]) {
  const { getSetPrerequisites } = await import('@/api/milestones')
  const results = await Promise.allSettled(allSets.map((s) => getSetPrerequisites(s.id)))
  prerequisites.value = results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []))
}

async function handleSortChange(sort: MilestoneSort) {
  milestoneSort.value = sort
  try {
    const { getMilestoneCompletionStats } = await import('@/api/milestones')
    milestones.value = await getMilestoneCompletionStats(authStore.userId ?? undefined, sort)
  } catch {
    milestones.value = []
  }
}

function selectMilestone(id: string | null) {
  selectedId.value = id
  if (id) selectedSetId.value = null
}

function selectSet(setId: string) {
  selectedSetId.value = setId
  selectedId.value = null
}

function handleResize() {
  isMobile.value = window.innerWidth < 768
}

onMounted(() => {
  handleResize()
  window.addEventListener('resize', handleResize)
  fetchData()
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})

watch(() => authStore.userId, fetchData)
</script>

<template>
  <div class="milestones-page">
    <header class="milestones-page__header">
      <h1 class="milestones-page__title">Milestones</h1>
      <div class="milestones-page__controls">
        <p v-if="!loading" class="milestones-page__summary">
          <template v-if="authStore.isLoggedIn">
            {{ totalCompleted }} of {{ totalMilestones }} complete across {{ sets.length }} sets.
          </template>
          <template v-else>
            {{ totalMilestones }} milestones across {{ sets.length }} sets.
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
        <Transition name="inspector" mode="out-in" :duration="{ enter: 300, leave: 100 }">
          <div :key="selectedId ?? selectedSetId ?? 'hint'" class="milestones-page__inspector-content">
            <template v-if="selectedMilestone">
              <MilestoneDetail :milestone="selectedMilestone" :logged-in="authStore.isLoggedIn"
                :glyph="selectedGlyph" />
              <MilestoneRewards :rewards="selectedRewards" />

              <div v-if="authStore.isLoggedIn && selectedMilestone.userCompleted" class="milestones-page__pin">
                <BaseButton size="sm" :disabled="!canPin || pinPending" @click="togglePin">
                  {{ selectedIsPinned ? 'Unpin from profile' : 'Pin to profile' }}
                </BaseButton>
                <span class="milestones-page__pin-count">{{ pinned.length }} / {{ pinSlotLimit }} pinned</span>
                <p v-if="pinFullNotice" class="milestones-page__pin-notice">{{ pinFullNotice }}</p>
              </div>
            </template>

            <template v-else-if="selectedSet && selectedSetStats">
              <div class="milestones-page__set">
                <h2 class="milestones-page__set-title">{{ selectedSet.title }}</h2>
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

            <p v-else class="milestones-page__hint">
              Pick a milestone on the map to read its target, progress and reward. Click a set heading
              for the set bonus.
            </p>
          </div>
        </Transition>
      </aside>
    </div>

    <MilestoneListView
      v-else
      :milestones="milestones"
      :sets="sets"
      :sort="milestoneSort"
      :logged-in="authStore.isLoggedIn"
      :groups="resolvedGroups"
      :standalone-sets="standaloneSets"
      :glyphs="glyphs"
      @update:sort="handleSortChange"
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

.milestones-page__title {
  font-size: var(--text-page-title);
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
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

.inspector-enter-active > * {
  animation: inspector-in 200ms cubic-bezier(0.25, 1, 0.5, 1) both;
}

.inspector-enter-active > :nth-child(2) {
  animation-delay: 50ms;
}

.inspector-enter-active > :nth-child(3) {
  animation-delay: 100ms;
}

.inspector-leave-active {
  transition: opacity 100ms ease-in;
}

.inspector-leave-to {
  opacity: 0;
}

@keyframes inspector-in {
  from {
    opacity: 0;
    transform: translateX(-16px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .inspector-enter-active > * {
    animation: none;
  }

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

.milestones-page__set-title {
  margin: 0;
  font-size: var(--text-section-heading);
  font-weight: 700;
  color: var(--text-primary);
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

.milestones-page__hint {
  margin: 0;
  padding: var(--space-md);
  border: 1px dashed var(--bg-overlay);
  border-radius: var(--radius-card);
  font-size: var(--text-body);
  color: var(--text-tertiary);
  line-height: 1.5;
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
