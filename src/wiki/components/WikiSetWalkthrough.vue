<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import BaseTabs from '@/components/common/BaseTabs.vue'
import '@/wiki/components/demo.css'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import MilestoneRow from '@/components/domain/MilestoneRow.vue'
import { useCountUp } from '@/composables/useCountUp'
import type { MilestoneCompletionResponse, MilestoneSetResponse } from '@/types/api/milestones'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { clamp } from '@/utils/math'

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

const setTabs = computed(() => orderedSets.value.map((set) => ({ key: set.id, label: set.title })))

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
  clamp(Math.round(18000 / Math.max(1, rows.value.length)), 320, 1100),
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
  <figure class="wiki-demo walk" data-wiki-raw>
    <SkeletonLoader v-if="loading" variant="card" height="420px" />

    <p v-else-if="failed || !selectedSet" class="caption">
      The live sets couldn't load right now. You can find them all on the milestones page.
    </p>

    <template v-else>
      <BaseTabs
        variant="segmented"
        label="Milestone sets"
        :tabs="setTabs"
        :model-value="selectedSetId ?? ''"
        @update:model-value="selectSet"
      />

      <div class="walk__head">
        <div class="walk__intro">
          <h4 class="card-title">{{ selectedSet.title }}</h4>
          <p class="caption">{{ selectedSet.description }}</p>
        </div>
        <BaseButton @click="toggle">{{ bonusLanded ? 'Replay' : playing ? 'Pause' : 'Play' }}</BaseButton>
      </div>

      <div class="walk__readout">
        <span class="wiki-demo__value walk__counter">{{ xpDisplay }} XP</span>
        <span class="caption">{{ step }} of {{ rows.length }} cleared in this run</span>
        <span class="caption walk__player">
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
          <MilestoneRow :milestone="milestone" />
        </div>
      </div>

      <div class="walk__bonus" :class="{ 'walk__bonus--landed': bonusLanded }">
        <span class="field-label">Set Bonus</span>
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
}

.walk__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-md);
}

.walk__readout {
  display: flex;
  align-items: baseline;
  gap: var(--space-md);
  flex-wrap: wrap;
}

.walk__counter {
  color: var(--accent);
}

.walk__player {
  margin-left: auto;
}

.walk__list {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  max-height: 360px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--bg-overlay) transparent;
}

.walk__row {
  cursor: pointer;
  border-radius: var(--radius-card);
  transition: opacity var(--dur-fast) var(--ease-out);
}

.walk__row--pending {
  opacity: 0.4;
}

.walk__row--current {
  outline: 1px solid var(--accent);
  outline-offset: -1px;
}

.walk__bonus {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-md);
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-card);
  background: var(--bg-base);
}

.walk__bonus-value {
  font-family: var(--font-mono);
  font-size: var(--text-body);
  color: var(--text-secondary);
  transition: color var(--dur-fast) var(--ease-out);
}

.walk__bonus--landed .walk__bonus-value {
  color: var(--accent);
}

@media (max-width: 560px) {
  .walk__player {
    margin-left: 0;
  }

  .walk__list {
    max-height: 420px;
  }
}
</style>
