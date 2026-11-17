<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import type { JobResponse } from '@/types/api/jobs'
import { formatDuration } from '@/utils/formatters'
import ToolCard from './ToolCard.vue'

const props = defineProps<{
  jobs: JobResponse[]
  labels: Record<string, string>
  loading: boolean
  error: string | null
}>()

defineEmits<{
  refresh: []
}>()

function clockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function duration(job: JobResponse): string {
  const end = job.finishedAt ? Date.parse(job.finishedAt) : Date.now()
  return formatDuration(end - Date.parse(job.startedAt), { seconds: true })
}

function statusLabel(status: string): string {
  return status.charAt(0) + status.slice(1).toLowerCase()
}
</script>

<template>
  <ToolCard title="Recent Jobs">
    <template #head>
      <BaseButton size="sm" :loading="loading" @click="$emit('refresh')">Refresh</BaseButton>
    </template>
    <p v-if="error" class="caption jobs__error" role="alert">{{ error }}</p>
    <p v-else-if="!jobs.length" class="caption">No jobs since the last backend restart</p>
    <ul v-else class="jobs__list">
      <li v-for="job in jobs" :key="job.id" class="job">
        <span class="job__label">{{ props.labels[job.type] ?? job.type }}</span>
        <span :class="`job__status--${job.status.toLowerCase()}`">{{ statusLabel(job.status) }}</span>
        <span class="caption job__detail">{{ job.error || job.detail || '-' }}</span>
        <span class="caption job__times">{{ clockTime(job.startedAt) }}, {{ duration(job) }}</span>
      </li>
    </ul>
  </ToolCard>
</template>

<style scoped>
.jobs__error,
.job__status--failed {
  color: var(--error);
}

.jobs__list {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
}

.job {
  display: grid;
  grid-template-columns: minmax(0, 280px) 96px minmax(0, 1fr) 150px;
  align-items: center;
  gap: var(--space-md);
  min-height: var(--control-h);
}

.job__label {
  font-weight: 600;
  color: var(--text-primary);
}

.job__status--running {
  color: var(--info);
}

.job__status--completed,
.job__status--succeeded {
  color: var(--success);
}

.job__detail {
  overflow-wrap: anywhere;
}

.job__times {
  text-align: right;
  white-space: nowrap;
}

@media (max-width: 767px) {
  .job {
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 0 var(--space-md);
    padding: var(--space-sm) 0;
  }
}
</style>
