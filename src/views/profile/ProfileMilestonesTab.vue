<script setup lang="ts">
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import MilestoneCard from '@/components/domain/MilestoneCard.vue'
import { useCategoryStore } from '@/stores/categories'
import type { MilestoneSetResponse } from '@/types/api/milestones'
import type { UserMilestoneProgressResponse } from '@/types/api/users'
import type { MilestoneDisplay } from '@/types/display'
import type { Page } from '@/types/pagination'
import { toMilestoneDisplay } from '@/utils/mappers'
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  userId: string
}>()

const categoryStore = useCategoryStore()
const loading = ref(false)
const milestones = ref<UserMilestoneProgressResponse[]>([])
const completedMilestones = ref<UserMilestoneProgressResponse[]>([])
const sets = ref<MilestoneSetResponse[]>([])
const expandedSets = ref<Set<string>>(new Set())
const viewMode = ref<'all' | 'completed'>('all')

interface MilestoneGroup {
  setId: string
  setTitle: string
  setDescription: string
  setBonusXp: number
  completedCount: number
  totalCount: number
  milestones: MilestoneDisplay[]
}

const activeMilestones = computed(() =>
  viewMode.value === 'completed' ? completedMilestones.value : milestones.value,
)

const groups = computed<MilestoneGroup[]>(() => {
  const setMap = new Map<string, MilestoneSetResponse>()
  for (const s of sets.value) {
    setMap.set(s.id, s)
  }

  const grouped = new Map<string, UserMilestoneProgressResponse[]>()
  for (const m of activeMilestones.value) {
    const key = m.setId || 'uncategorized'
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(m)
  }

  const result: MilestoneGroup[] = []
  for (const [setId, items] of grouped) {
    const setInfo = setMap.get(setId)
    const completedCount = items.filter((m) => m.completed).length
    result.push({
      setId,
      setTitle: setInfo?.title ?? 'Other',
      setDescription: setInfo?.description ?? '',
      setBonusXp: setInfo?.setBonusXp ?? 0,
      completedCount,
      totalCount: items.length,
      milestones: items.map((m) => {
        const categoryCode = m.categoryId
          ? categoryStore.getCategoryCode(m.categoryId)
          : undefined
        return toMilestoneDisplay(m, categoryCode)
      }),
    })
  }
  return result
})

function toggleSet(setId: string) {
  if (expandedSets.value.has(setId)) {
    expandedSets.value.delete(setId)
  } else {
    expandedSets.value.add(setId)
  }
}

function isExpanded(setId: string): boolean {
  return expandedSets.value.has(setId)
}

async function fetchMilestones() {
  loading.value = true
  try {
    const [{ getUserMilestones, getUserCompletedMilestones }, { getMilestoneSets }] = await Promise.all([
      import('@/api/users'),
      import('@/api/milestones'),
    ])

    const [milestoneRes, completedRes, setRes] = await Promise.all([
      getUserMilestones(props.userId, { size: 100 }),
      getUserCompletedMilestones(props.userId),
      getMilestoneSets({ size: 100 }),
    ]) as [Page<UserMilestoneProgressResponse>, UserMilestoneProgressResponse[], Page<MilestoneSetResponse>]

    milestones.value = milestoneRes.content
    completedMilestones.value = completedRes
    sets.value = setRes.content

    if (groups.value.length > 0) {
      expandedSets.value.add(groups.value[0].setId)
    }
  } catch {
    milestones.value = []
    completedMilestones.value = []
    sets.value = []
  }
  loading.value = false
}

watch(() => props.userId, () => { fetchMilestones() }, { immediate: true })
</script>

<template>
  <div class="milestones-tab">
    <div class="milestones-tab__header">
      <button class="milestones-tab__toggle" :class="{ 'milestones-tab__toggle--active': viewMode === 'all' }"
        @click="viewMode = 'all'">
        All Progress
      </button>
      <button class="milestones-tab__toggle" :class="{ 'milestones-tab__toggle--active': viewMode === 'completed' }"
        @click="viewMode = 'completed'">
        Completed ({{ completedMilestones.length }})
      </button>
    </div>

    <template v-if="loading">
      <SkeletonLoader v-for="i in 3" :key="i" variant="card" />
    </template>

    <template v-else-if="groups.length === 0">
      <p class="milestones-tab__empty">
        {{ viewMode === 'completed' ? 'No completed milestones yet' : 'No milestone progress found' }}
      </p>
    </template>

    <template v-else>
      <div v-for="group in groups" :key="group.setId" class="milestone-set">
        <button class="milestone-set__header" @click="toggleSet(group.setId)">
          <div class="milestone-set__info">
            <h3 class="milestone-set__title">{{ group.setTitle }}</h3>
            <span class="milestone-set__count">
              {{ group.completedCount }}/{{ group.totalCount }} completed
            </span>
          </div>
          <div class="milestone-set__meta">
            <span v-if="group.setBonusXp > 0" class="milestone-set__bonus">
              +{{ group.setBonusXp }} XP bonus
            </span>
            <span class="milestone-set__toggle" :class="{ 'milestone-set__toggle--open': isExpanded(group.setId) }">
              &#9660;
            </span>
          </div>
        </button>

        <p v-if="group.setDescription" class="milestone-set__desc">
          {{ group.setDescription }}
        </p>

        <div v-if="isExpanded(group.setId)" class="milestone-set__grid">
          <MilestoneCard v-for="milestone in group.milestones" :key="milestone.id" :milestone="milestone" />
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.milestones-tab {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.milestones-tab__header {
  display: flex;
  gap: var(--space-xs);
}

.milestones-tab__toggle {
  padding: var(--space-xs) var(--space-md);
  background: none;
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-btn);
  color: var(--text-secondary);
  font-size: var(--text-caption);
  font-family: var(--font-sans);
  cursor: pointer;
  transition: all 120ms ease;
}

.milestones-tab__toggle:hover {
  border-color: var(--text-tertiary);
  color: var(--text-primary);
}

.milestones-tab__toggle--active {
  background: color-mix(in srgb, var(--accent) 10%, transparent);
  border-color: var(--accent);
  color: var(--accent);
}

.milestones-tab__empty {
  padding: var(--space-3xl) var(--space-md);
  text-align: center;
  color: var(--text-secondary);
  margin: 0;
}

.milestone-set {
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  overflow: hidden;
}

.milestone-set__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: var(--space-md) var(--space-lg);
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
  font-family: var(--font-sans);
  transition: background-color 120ms ease;
}

.milestone-set__header:hover {
  background: var(--bg-elevated);
}

.milestone-set__info {
  display: flex;
  align-items: baseline;
  gap: var(--space-md);
}

.milestone-set__title {
  font-size: var(--text-card-title);
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.milestone-set__count {
  font-size: var(--text-caption);
  color: var(--text-secondary);
  font-family: var(--font-mono);
}

.milestone-set__meta {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.milestone-set__bonus {
  font-size: var(--text-caption);
  color: var(--accent);
  font-family: var(--font-mono);
  font-weight: 500;
}

.milestone-set__toggle {
  font-size: 0.6rem;
  color: var(--text-tertiary);
  transition: transform 150ms ease;
}

.milestone-set__toggle--open {
  transform: rotate(180deg);
}

.milestone-set__desc {
  padding: 0 var(--space-lg);
  margin: 0 0 var(--space-sm) 0;
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

.milestone-set__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: var(--space-md);
  padding: var(--space-md) var(--space-lg) var(--space-lg);
}
</style>
