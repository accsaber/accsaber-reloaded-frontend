<script setup lang="ts">
import { parseApiError } from '@/api/client'
import IconButton from '@/components/common/IconButton.vue'
import HeroFact from '@/components/domain/HeroFact.vue'
import type { AutoCriteriaCheckResponse, AutoCriteriaStatus } from '@/types/api/maps'
import { AUTO_CRITERIA_LABELS } from '@/utils/constants'
import { ref, watch } from 'vue'

const props = defineProps<{
  difficultyId: string
  status: AutoCriteriaStatus | null
  run?: () => Promise<AutoCriteriaCheckResponse>
}>()

const current = ref<AutoCriteriaStatus>('PENDING')
const failures = ref<string[]>([])
const running = ref(false)
const error = ref('')

watch(
  () => [props.difficultyId, props.status] as const,
  ([, next]) => {
    current.value = next ?? 'PENDING'
    failures.value = []
    error.value = ''
  },
  { immediate: true },
)

async function check() {
  if (!props.run) return
  const id = props.difficultyId
  running.value = true
  error.value = ''
  try {
    const result = await props.run()
    if (id !== props.difficultyId) return
    current.value = result.status
    failures.value = result.failures ?? []
  } catch (err) {
    if (id === props.difficultyId) error.value = parseApiError(err, 'Could not run the check').message
  } finally {
    running.value = false
  }
}
</script>

<template>
  <HeroFact label="Auto Check">
    <span :class="`criteria-text--${current.toLowerCase()}`">{{ AUTO_CRITERIA_LABELS[current] }}</span>
    <IconButton v-if="run" label="Run Auto Check" title="Run Auto Check" :disabled="running" @click="check">
      <svg :class="{ 'auto-check__icon--running': running }" width="16" height="16"
        viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
        stroke-linejoin="round" aria-hidden="true">
        <path d="M21 12a9 9 0 1 1-2.64-6.36" />
        <path d="M21 3v6h-6" />
      </svg>
    </IconButton>
  </HeroFact>
  <p v-if="error" class="caption auto-check__wide auto-check__error" role="alert">{{ error }}</p>
  <Transition name="collapse">
    <div v-if="failures.length" class="collapsible auto-check__wide">
      <ul class="criteria-failures">
        <li v-for="(failure, i) in failures" :key="i">{{ failure }}</li>
      </ul>
    </div>
  </Transition>
</template>

<style scoped>
.auto-check__icon--running {
  animation: spin var(--dur-spin) linear infinite;
}

.auto-check__wide {
  flex-basis: 100%;
}

.auto-check__error {
  color: var(--error);
}
</style>
