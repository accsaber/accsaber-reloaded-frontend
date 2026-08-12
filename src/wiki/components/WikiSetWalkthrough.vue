<script setup lang="ts">
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import MilestoneDetail from '@/components/domain/MilestoneDetail.vue'
import { useCountUp } from '@/composables/useCountUp'
import type { MilestoneCompletionResponse, MilestoneSetResponse } from '@/types/api/milestones'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

const props = defineProps<{
  userId: string
  userName: string
  isViewer: boolean
}>()

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

const sets = ref<MilestoneSetResponse[]>([])
const milestones = ref<MilestoneCompletionResponse[]>([])
const selectedSetId = ref<string | null>(null)
const loading = ref(true)
const failed = ref(false)
const step = ref(0)
const playing = ref(false)

const listRef = ref<HTMLElement | null>(null)
let timer: number | null = null

const orderedSets = computed(() =>
  [...sets.value].sort(
    (a, b) => a.createdAt.localeCompare(b.createdAt) || a.title.localeCompare(b.title),
  ),
)

const selectedSet = computed(
  () => orderedSets.value.find((set) => set.id === selectedSetId.value) ?? null,
)

const rows = computed(() =>
  milestones.value.filter((milestone) => milestone.setId === selectedSetId.value),
)

const interval = computed(() =>
  Math.min(1100, Math.max(320, Math.round(18000 / Math.max(1, rows.value.length)))),
)

const bonusLanded = computed(() => rows.value.length > 0 && step.value >= rows.value.length)

const bankedXp = computed(() =>
  rows.value.slice(0, step.value).reduce((sum, milestone) => sum + milestone.xp, 0),
)

const totalXp = computed(
  () => bankedXp.value + (bonusLanded.value ? (selectedSet.value?.setBonusXp ?? 0) : 0),
)

const { displayValue: xpDisplay } = useCountUp(totalXp, { decimals: 0, duration: 300 })

const clearedByPlayer = computed(() => rows.value.filter((row) => row.userCompleted).length)

const progressLabel = computed(() =>
  props.isViewer ? 'You have cleared' : `${props.userName} has cleared`,
)

function stopTimer() {
  if (timer !== null) {
    clearTimeout(timer)
    timer = null
  }
}

function selectSet(id: string) {
  if (selectedSetId.value === id) return
  selectedSetId.value = id
  step.value = reducedMotion ? rows.value.length : 0
  playing.value = !reducedMotion
}

function jumpTo(index: number) {
  playing.value = false
  step.value = index + 1
}

function toggle() {
  if (bonusLanded.value) {
    step.value = 0
    playing.value = true
    return
  }
  playing.value = !playing.value
}

watch([playing, step], () => {
  stopTimer()
  if (!playing.value) return
  if (step.value >= rows.value.length) {
    playing.value = false
    return
  }
  timer = window.setTimeout(() => {
    step.value += 1
  }, interval.value)
})

watch(step, (value) => {
  const list = listRef.value
  if (!list || value === 0) return
  const row = list.children[value - 1]
  if (!(row instanceof HTMLElement)) return
  list.scrollTo({
    top: row.offsetTop - list.clientHeight / 2 + row.clientHeight / 2,
    behavior: reducedMotion ? 'auto' : 'smooth',
  })
})

onMounted(async () => {
  try {
    const { getMilestoneSets, getMilestoneCompletionStats } = await import('@/api/milestones')
    const [setsPage, stats] = await Promise.all([
      getMilestoneSets({ size: 100 }),
      getMilestoneCompletionStats(props.userId),
    ])
    sets.value = setsPage.content
    milestones.value = stats
    selectedSetId.value = orderedSets.value[0]?.id ?? null
    if (reducedMotion) {
      step.value = rows.value.length
    } else {
      playing.value = true
    }
  } catch {
    failed.value = true
  } finally {
    loading.value = false
  }
})

onUnmounted(stopTimer)
</script>

<template>
  <figure class="walk" data-wiki-raw>
    <SkeletonLoader v-if="loading" variant="card" height="420px" />

    <p v-else-if="failed || !selectedSet" class="walk__error">
      The live sets could not load right now. You will find them all on the milestones page.
    </p>

    <template v-else>
      <div class="walk__sets" role="tablist" aria-label="Milestone sets">
        <button
          v-for="set in orderedSets"
          :key="set.id"
          class="walk__set"
          :class="{ 'walk__set--active': set.id === selectedSetId }"
          role="tab"
          :aria-selected="set.id === selectedSetId"
          @click="selectSet(set.id)"
        >
          {{ set.title }}
        </button>
      </div>

      <div class="walk__head">
        <div class="walk__intro">
          <h4 class="walk__title">{{ selectedSet.title }}</h4>
          <p class="walk__desc">{{ selectedSet.description }}</p>
        </div>
        <button
          class="walk__play"
          :aria-label="bonusLanded ? 'Replay the set' : playing ? 'Pause' : 'Play'"
          @click="toggle"
        >
          <svg
            v-if="bonusLanded"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M3 12a9 9 0 1 0 3-6.7" />
            <path d="M3 4v5h5" />
          </svg>
          <svg
            v-else-if="playing"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <line x1="9" y1="5" x2="9" y2="19" />
            <line x1="15" y1="5" x2="15" y2="19" />
          </svg>
          <svg
            v-else
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M6 4l14 8-14 8z" />
          </svg>
          <span>{{ bonusLanded ? 'Replay' : playing ? 'Pause' : 'Play' }}</span>
        </button>
      </div>

      <div class="walk__readout">
        <span class="walk__counter">
          <strong>{{ xpDisplay }}</strong> XP
        </span>
        <span class="walk__meta">{{ step }} of {{ rows.length }} cleared in this run</span>
        <span class="walk__meta walk__meta--player">
          {{ progressLabel }} {{ clearedByPlayer }} of {{ rows.length }}
        </span>
      </div>

      <div ref="listRef" class="walk__list">
        <div
          v-for="(milestone, index) in rows"
          :key="milestone.milestoneId"
          class="walk__row"
          :class="{
            'walk__row--pending': index >= step,
            'walk__row--current': index === step - 1,
          }"
          @click="jumpTo(index)"
        >
          <MilestoneDetail :milestone="milestone" compact />
        </div>
      </div>

      <div class="walk__bonus" :class="{ 'walk__bonus--landed': bonusLanded }">
        <span class="walk__bonus-label">Set bonus</span>
        <span class="walk__bonus-value">
          {{ bonusLanded ? `+${selectedSet.setBonusXp.toLocaleString()} XP` : `${selectedSet.setBonusXp.toLocaleString()} XP once every one is done` }}
        </span>
      </div>
    </template>
  </figure>
</template>

<style scoped>
.walk {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  margin: 0 0 var(--space-md);
  padding: var(--space-md);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  background: var(--bg-surface);
}

.walk__error {
  color: var(--text-secondary);
  margin: 0;
}

.walk__sets {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs);
}

.walk__set {
  padding: var(--space-xs) var(--space-sm);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-btn);
  background: none;
  color: var(--text-secondary);
  font-family: var(--font-sans);
  font-size: var(--text-caption);
  cursor: pointer;
  transition: color 120ms ease, border-color 120ms ease;
}

.walk__set:hover {
  color: var(--text-primary);
  border-color: var(--text-tertiary);
}

.walk__set--active {
  color: var(--accent);
  border-color: var(--accent);
  font-weight: 600;
}

.walk__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-md);
}

.walk__title {
  margin: 0;
  font-size: var(--text-card-title);
  font-weight: 600;
  color: var(--text-primary);
}

.walk__desc {
  margin: 2px 0 0;
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

.walk__play {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  flex-shrink: 0;
  padding: var(--space-xs) var(--space-sm);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-btn);
  background: none;
  color: var(--text-primary);
  font-family: var(--font-sans);
  font-size: var(--text-caption);
  cursor: pointer;
  transition: background-color 120ms ease, border-color 120ms ease;
}

.walk__play:hover {
  background: var(--bg-elevated);
  border-color: var(--text-tertiary);
}

.walk__readout {
  display: flex;
  align-items: baseline;
  gap: var(--space-md);
  flex-wrap: wrap;
  padding-bottom: var(--space-sm);
  border-bottom: 1px solid var(--bg-overlay);
}

.walk__counter {
  font-family: var(--font-mono);
  font-size: var(--text-stat-lg);
  color: var(--accent);
}

.walk__counter strong {
  font-weight: 600;
}

.walk__meta {
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

.walk__meta--player {
  margin-left: auto;
  color: var(--text-tertiary);
}

.walk__list {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  max-height: 360px;
  overflow-y: auto;
}

.walk__row {
  cursor: pointer;
  border-radius: var(--radius-card);
  transition: opacity 180ms ease-out;
}

.walk__row--pending {
  opacity: 0.32;
}

.walk__row--current {
  outline: 1px solid color-mix(in srgb, var(--accent) 45%, transparent);
  outline-offset: -1px;
}

.walk__bonus {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-md);
  padding: var(--space-sm) var(--space-md);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  opacity: 0.5;
  transition: opacity 180ms ease-out, border-color 180ms ease-out;
}

.walk__bonus--landed {
  opacity: 1;
  border-color: var(--accent);
}

.walk__bonus-label {
  font-size: var(--text-caption);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary);
}

.walk__bonus-value {
  font-family: var(--font-mono);
  font-size: var(--text-body);
  color: var(--text-primary);
}

.walk__bonus--landed .walk__bonus-value {
  color: var(--accent);
}

@media (max-width: 560px) {
  .walk__head {
    flex-direction: column;
  }

  .walk__meta--player {
    margin-left: 0;
  }

  .walk__list {
    max-height: 420px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .walk__row,
  .walk__bonus {
    transition: none;
  }
}
</style>
