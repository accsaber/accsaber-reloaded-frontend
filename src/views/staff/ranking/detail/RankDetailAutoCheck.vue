<script setup lang="ts">
import IconButton from '@/components/common/IconButton.vue'
import type { AutoCriteriaStatus, MapDifficultyResponse } from '@/types/api/maps'
import { ref, watch } from 'vue'

const props = defineProps<{
  difficulty: MapDifficultyResponse
  canRun: boolean
}>()

const LABEL: Record<AutoCriteriaStatus, string> = {
  PASSED: 'Passed',
  FAILED: 'Failed',
  UNAVAILABLE: 'Unavailable',
  PENDING: 'Pending',
}
const TONE: Record<AutoCriteriaStatus, string> = {
  PASSED: 'passed',
  FAILED: 'failed',
  UNAVAILABLE: 'unavailable',
  PENDING: 'pending',
}

const status = ref<AutoCriteriaStatus>('PENDING')
const failures = ref<string[]>([])
const running = ref(false)
const error = ref('')

watch(
  () => [props.difficulty.id, props.difficulty.autoCriteriaStatus] as const,
  ([, next]) => {
    status.value = next ?? 'PENDING'
    failures.value = []
    error.value = ''
  },
  { immediate: true },
)

async function run() {
  running.value = true
  error.value = ''
  try {
    const { runAutoCriteriaCheck } = await import('@/api/ranking/maps')
    const result = await runAutoCriteriaCheck(props.difficulty.id)
    status.value = result.status
    failures.value = result.failures ?? []
  } catch {
    error.value = 'Could not run the check'
  } finally {
    running.value = false
  }
}
</script>

<template>
  <div class="auto-check">
    <span class="field-label">Auto Check</span>
    <span class="auto-check__row">
      <span class="auto-check__value" :class="`criteria-text--${TONE[status]}`">{{ LABEL[status] }}</span>
      <IconButton v-if="canRun" label="Run Auto Check" title="Run Auto Check" :disabled="running" @click="run">
        <svg class="auto-check__icon" :class="{ 'auto-check__icon--running': running }" width="16" height="16"
          viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
          stroke-linejoin="round" aria-hidden="true">
          <path d="M21 12a9 9 0 1 1-2.64-6.36" />
          <path d="M21 3v6h-6" />
        </svg>
      </IconButton>
    </span>
  </div>
  <p v-if="error" class="caption auto-check__error" role="alert">{{ error }}</p>
  <Transition name="collapse">
    <div v-if="failures.length" class="collapsible auto-check__wide">
      <ul class="auto-check__failures">
        <li v-for="(failure, i) in failures" :key="i">{{ failure }}</li>
      </ul>
    </div>
  </Transition>
</template>

<style scoped>
.auto-check {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.auto-check__row {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  min-height: 28px;
}

.auto-check__icon--running {
  animation: spin 600ms linear infinite;
}

.auto-check__value {
  font-weight: 600;
}

.auto-check__error,
.auto-check__wide {
  grid-column: 1 / -1;
}

.auto-check__error {
  color: var(--error);
}

.auto-check__failures {
  margin: 0;
  padding: 0 0 0 var(--space-lg);
  font-size: var(--text-body);
  line-height: 1.5;
  color: var(--text-secondary);
}
</style>
