<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import type { JobFieldValue, JobTypeResponse, RunJobRequest } from '@/types/api/jobs'
import { computed, ref, watch } from 'vue'
import JobFieldControl from './JobFieldControl.vue'

const props = defineProps<{
  types: JobTypeResponse[]
  loading: boolean
  runningTypes: string[]
  submitting: boolean
  error: string | null
  notice: string | null
}>()

const emit = defineEmits<{
  submit: [request: RunJobRequest]
}>()

const selectedType = ref<string | null>(null)
const values = ref<Record<string, JobFieldValue>>({})
const armed = ref(false)

const groups = computed(() => {
  const byGroup = new Map<string, JobTypeResponse[]>()
  for (const type of props.types) {
    const bucket = byGroup.get(type.group)
    if (bucket) bucket.push(type)
    else byGroup.set(type.group, [type])
  }
  return [...byGroup.entries()]
})

const selected = computed(() => props.types.find((t) => t.type === selectedType.value) ?? null)

const alreadyRunning = computed(
  () => !!selectedType.value && props.runningTypes.includes(selectedType.value),
)

function isFilled(value: JobFieldValue): boolean {
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'string') return value.trim().length > 0
  return typeof value === 'boolean'
}

const canRun = computed(() => {
  const job = selected.value
  if (!job) return false
  return job.fields.every((field) => !field.required || isFilled(values.value[field.key] ?? null))
})

function humanize(value: string): string {
  const words = value.toLowerCase().split('_').join(' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}

watch(selected, (job) => {
  armed.value = false
  const next: Record<string, JobFieldValue> = {}
  for (const field of job?.fields ?? []) {
    next[field.key] = field.kind === 'FLAG' ? false : null
  }
  values.value = next
})

watch(
  () => props.submitting,
  (busy) => {
    if (busy) armed.value = false
  },
)

function run() {
  const job = selected.value
  if (!job || !canRun.value || props.submitting) return
  if (alreadyRunning.value && !armed.value) {
    armed.value = true
    return
  }
  armed.value = false
  const request: RunJobRequest = { type: job.type }
  for (const field of job.fields) {
    const value = values.value[field.key] ?? null
    if (isFilled(value)) request[field.key] = value
  }
  emit('submit', request)
}
</script>

<template>
  <section class="surface-card runner">
    <div class="runner__catalogue">
      <template v-if="loading && types.length === 0">
        <SkeletonLoader v-for="n in 12" :key="n" class="placeholder" height="var(--control-h)" />
      </template>
      <div v-for="[group, jobs] in groups" :key="group" class="runner__group">
        <h4 class="field-label">{{ humanize(group) }}</h4>
        <button v-for="job in jobs" :key="job.type" type="button" class="runner__job pressable"
          :class="{ 'runner__job--active': job.type === selectedType }" :aria-pressed="job.type === selectedType"
          @click="selectedType = job.type">
          <span class="runner__job-label">{{ job.label }}</span>
          <span v-if="runningTypes.includes(job.type)" class="caption runner__running">Running</span>
        </button>
      </div>
    </div>

    <div class="runner__form">
      <p v-if="!selected" class="caption">Pick a job</p>
      <template v-else>
        <h3 class="card-title">{{ selected.label }}</h3>
        <p class="runner__desc">{{ selected.description }}</p>

        <JobFieldControl v-for="field in selected.fields" :key="field.key" :field="field"
          :model-value="values[field.key] ?? null" :disabled="submitting"
          @update:model-value="values[field.key] = $event" />

        <div class="runner__actions">
          <BaseButton :variant="armed ? 'destructive' : 'primary'" :loading="submitting" :disabled="!canRun" @click="run">
            {{ armed ? 'Run It Anyway' : 'Run Job' }}
          </BaseButton>
          <BaseButton v-if="armed" @click="armed = false">Cancel</BaseButton>
          <span class="caption runner__status" :class="{ 'runner__status--error': error, 'runner__status--warn': !error && alreadyRunning }"
            :role="error ? 'alert' : 'status'">
            {{ error || (alreadyRunning ? 'Already running, starting it again runs it twice' : notice) }}
          </span>
        </div>
      </template>
    </div>
  </section>
</template>

<style scoped>
.runner {
  display: grid;
  grid-template-columns: minmax(0, 300px) minmax(0, 1fr);
  gap: var(--space-xl);
}

.runner__catalogue {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  max-height: 560px;
  overflow-y: auto;
}

.runner__group {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.runner__job {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
  min-height: var(--control-h);
  padding: var(--space-xs) var(--space-sm);
  font: inherit;
  color: var(--text-secondary);
  text-align: left;
  background: none;
  border: none;
  border-radius: var(--radius-btn);
  cursor: pointer;
  transition: background-color var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out);
}

.runner__job:hover {
  color: var(--text-primary);
  background: var(--bg-elevated);
}

.runner__job--active {
  font-weight: 600;
  color: var(--text-primary);
  background: var(--bg-overlay);
}

.runner__running {
  flex-shrink: 0;
  color: var(--info);
}

.runner__form {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  min-width: 0;
  max-width: 640px;
}

.runner__desc {
  margin: 0;
  line-height: 1.5;
  color: var(--text-secondary);
}

.runner__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-sm);
}

.runner__status {
  min-height: 1lh;
  overflow-wrap: anywhere;
}

.runner__status--error {
  color: var(--error);
}

.runner__status--warn {
  color: var(--warning);
}

@media (max-width: 900px) {
  .runner {
    grid-template-columns: minmax(0, 1fr);
  }

  .runner__catalogue {
    max-height: 260px;
  }
}
</style>
