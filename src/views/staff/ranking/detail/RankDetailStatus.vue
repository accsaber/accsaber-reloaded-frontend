<script setup lang="ts">
import type { AutoCriteriaStatus, MapDifficultyResponse, VoteListResponse } from '@/types/api/maps'
import type { VoteType } from '@/types/enums'
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  difficulty: MapDifficultyResponse
  voteData: VoteListResponse | null
  isRanking: boolean
}>()

type Verdict = 'passed' | 'failed' | 'pending'

const HEAD_CRITERIA: Record<VoteType, { verdict: Verdict; label: string; threshold: string }> = {
  UPVOTE: { verdict: 'passed', label: 'PASS', threshold: 'Pass' },
  DOWNVOTE: { verdict: 'failed', label: 'FAIL', threshold: 'Fail' },
  NEUTRAL: { verdict: 'pending', label: 'NEUTRAL', threshold: 'Neutral' },
}

const HEAD_THRESHOLD_CLASS: Record<VoteType, string> = {
  UPVOTE: 'threshold--override-pass',
  DOWNVOTE: 'threshold--override-fail',
  NEUTRAL: 'threshold--override',
}

const AUTO_LABEL: Record<AutoCriteriaStatus, string> = {
  PASSED: 'Auto: Passed',
  FAILED: 'Auto: Failed',
  UNAVAILABLE: 'Auto: Unavailable',
  PENDING: 'Auto: Pending',
}

const autoStatus = ref<AutoCriteriaStatus | null>(null)
const autoFailures = ref<string[]>([])
const autoFailuresOpen = ref(false)
const autoRunning = ref(false)
const autoError = ref('')

watch(() => props.difficulty.autoCriteriaStatus, (s) => {
  autoStatus.value = s ?? null
}, { immediate: true })

const autoLabel = computed(() => AUTO_LABEL[autoStatus.value ?? 'PENDING'] ?? 'Auto: Pending')
const autoClass = computed(() => `auto-badge--${(autoStatus.value ?? 'PENDING').toLowerCase()}`)

const statusClass = computed(() => {
  const status = props.difficulty.status
  if (status === 'RANKED') return 'status-pill--ranked'
  if (status === 'QUALIFIED') return 'status-pill--qualified'
  return 'status-pill--queue'
})

const communityCriteria = computed<{ verdict: Verdict; label: string } | null>(() => {
  const v = props.voteData
  if (!v || (v.criteriaUpvotes === 0 && v.criteriaDownvotes === 0)) return null
  if (v.criteriaUpvotes > v.criteriaDownvotes) return { verdict: 'passed', label: 'PASS' }
  if (v.criteriaDownvotes > v.criteriaUpvotes) return { verdict: 'failed', label: 'FAIL' }
  return { verdict: 'pending', label: 'PENDING' }
})

const criteriaClass = computed(() => {
  const status = props.difficulty.criteriaStatus
  if (status === 'PASSED') return 'criteria-badge--passed'
  if (status === 'FAILED') return 'criteria-badge--failed'
  return 'criteria-badge--pending'
})

async function runAutoCriteria() {
  if (autoRunning.value) return
  autoRunning.value = true
  autoError.value = ''
  try {
    const { runAutoCriteriaCheck } = await import('@/api/ranking/maps')
    const res = await runAutoCriteriaCheck(props.difficulty.id)
    autoStatus.value = res.status
    autoFailures.value = res.failures ?? []
    autoFailuresOpen.value = autoFailures.value.length > 0
  } catch {
    autoError.value = 'Failed to run auto criteria check'
    window.setTimeout(() => {
      autoError.value = ''
    }, 4000)
  } finally {
    autoRunning.value = false
  }
}
</script>

<template>
  <div class="status">
    <span class="status-pill" :class="statusClass">{{ difficulty.status }}</span>
    <template v-if="difficulty.status !== 'RANKED'">
      <span v-if="voteData?.headCriteriaVote" class="criteria-badge"
        :class="`criteria-badge--${HEAD_CRITERIA[voteData.headCriteriaVote].verdict}`">
        Criteria: HEAD {{ HEAD_CRITERIA[voteData.headCriteriaVote].label }}
      </span>
      <span v-else-if="communityCriteria" class="criteria-badge"
        :class="`criteria-badge--${communityCriteria.verdict}`">
        Criteria: {{ communityCriteria.label }}
      </span>
      <span v-else class="criteria-badge" :class="criteriaClass">
        Criteria: {{ difficulty.criteriaStatus }}
      </span>
      <button v-if="isRanking" type="button" class="auto-badge auto-badge--interactive" :class="autoClass"
        :disabled="autoRunning" @click="runAutoCriteria"
        :aria-label="autoRunning ? 'Running auto criteria check' : 'Run auto criteria check'"
        :title="autoStatus === 'UNAVAILABLE' ? 'The automated checker couldn\'t process this map. Check criteria manually. Click to re-run.' : 'Click to run the automated criteria check'">
        <span v-if="autoRunning" class="auto-badge__spinner" aria-hidden="true" />
        <svg v-else width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <polyline points="23 4 23 10 17 10" />
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
        </svg>
        {{ autoLabel }}
      </button>
      <span v-else class="auto-badge" :class="autoClass"
        :title="autoStatus === 'UNAVAILABLE' ? 'The automated checker couldn\'t process this map. Check criteria manually.' : undefined">
        {{ autoLabel }}
      </span>
    </template>
    <template v-if="voteData">
      <span v-if="difficulty.status === 'RANKED'" class="threshold"
        :class="{ 'threshold--met': voteData.reweightReady }">
        {{ voteData.reweightReady ? 'Reweight Ready' : 'Not Reweight Ready' }}
      </span>
      <span v-if="voteData.headCriteriaVote" class="threshold" :class="HEAD_THRESHOLD_CLASS[voteData.headCriteriaVote]">
        Head: {{ HEAD_CRITERIA[voteData.headCriteriaVote].threshold }}
      </span>
    </template>
  </div>

  <div v-if="autoError" class="auto-error">{{ autoError }}</div>

  <div v-if="autoFailures.length" class="auto-failures">
    <button class="auto-failures__header" @click="autoFailuresOpen = !autoFailuresOpen">
      <svg class="auto-failures__chevron" :class="{ 'auto-failures__chevron--open': autoFailuresOpen }"
        width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <polyline points="6 9 12 15 18 9" />
      </svg>
      Violations ({{ autoFailures.length }})
    </button>
    <ul v-if="autoFailuresOpen" class="auto-failures__list">
      <li v-for="(f, i) in autoFailures" :key="i">{{ f }}</li>
    </ul>
  </div>
</template>

<style scoped>
.status {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-sm);
  margin-top: var(--space-sm);
}

.auto-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  font-size: var(--text-caption);
  font-weight: 600;
  padding: 2px var(--space-sm);
  border-radius: var(--radius-pill);
  border: 1px solid transparent;
  white-space: nowrap;
}

.auto-badge--interactive {
  cursor: pointer;
  background: transparent;
  font-family: inherit;
  transition: filter 120ms ease, transform 120ms ease;
}

.auto-badge--interactive:hover:not(:disabled) {
  filter: brightness(1.1);
}

.auto-badge--interactive:active:not(:disabled) {
  transform: scale(0.97);
}

.auto-badge--interactive:disabled {
  cursor: progress;
  opacity: 0.7;
}

.auto-badge--pending {
  background: color-mix(in srgb, var(--text-tertiary) 15%, transparent);
  color: var(--text-secondary);
  border-color: color-mix(in srgb, var(--text-tertiary) 30%, transparent);
}

.auto-badge--passed {
  background: color-mix(in srgb, var(--success) 15%, transparent);
  color: var(--success);
  border-color: color-mix(in srgb, var(--success) 30%, transparent);
}

.auto-badge--failed {
  background: color-mix(in srgb, var(--error) 15%, transparent);
  color: var(--error);
  border-color: color-mix(in srgb, var(--error) 30%, transparent);
}

.auto-badge--unavailable {
  background: color-mix(in srgb, var(--warning) 15%, transparent);
  color: var(--warning);
  border-color: color-mix(in srgb, var(--warning) 30%, transparent);
  cursor: help;
}

.auto-badge__spinner {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid color-mix(in srgb, var(--text-tertiary) 40%, transparent);
  border-top-color: var(--text-primary);
  animation: spin 700ms linear infinite;
}

.auto-error {
  margin-top: var(--space-sm);
  font-size: var(--text-caption);
  color: var(--error);
}

.auto-failures {
  margin-top: var(--space-sm);
  background: var(--bg-elevated);
  border: 1px solid color-mix(in srgb, var(--error) 30%, transparent);
  border-radius: var(--radius-btn);
  overflow: hidden;
}

.auto-failures__header {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  width: 100%;
  padding: var(--space-xs) var(--space-sm);
  background: none;
  border: none;
  cursor: pointer;
  font-size: var(--text-caption);
  font-weight: 600;
  color: var(--error);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.auto-failures__chevron {
  transition: transform 150ms ease;
  flex-shrink: 0;
}

.auto-failures__chevron--open {
  transform: rotate(180deg);
}

.auto-failures__list {
  margin: 0;
  padding: var(--space-xs) var(--space-sm) var(--space-sm) calc(var(--space-sm) + 18px);
  list-style: disc;
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--text-secondary);
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.threshold {
  font-size: var(--text-caption);
  font-weight: 600;
  padding: 2px var(--space-sm);
  border-radius: var(--radius-pill);
  background: var(--bg-elevated);
  color: var(--text-tertiary);
  border: 1px solid var(--bg-overlay);
}

.threshold--met,
.threshold--override-pass {
  background: color-mix(in srgb, var(--success) 15%, transparent);
  color: var(--success);
  border-color: color-mix(in srgb, var(--success) 30%, transparent);
}

.threshold--override {
  background: color-mix(in srgb, var(--warning) 15%, transparent);
  color: var(--warning);
  border-color: color-mix(in srgb, var(--warning) 30%, transparent);
}

.threshold--override-fail {
  background: color-mix(in srgb, var(--error) 15%, transparent);
  color: var(--error);
  border-color: color-mix(in srgb, var(--error) 30%, transparent);
}
</style>
