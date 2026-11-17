<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import type { JobResponse, JobTypeResponse, RunJobRequest } from '@/types/api/jobs'
import { formatRelativeDate } from '@/utils/formatters'
import JobRunner from './JobRunner.vue'
import JobsList from './JobsList.vue'
import ToolCard from './ToolCard.vue'
import { describeFailure } from './operationState'
import { computed, onUnmounted, ref } from 'vue'

type Platform = 'beatleader' | 'scoresaber'

const RUNNING_POLL_MS = 4000
const PLATFORMS: { key: Platform; label: string }[] = [
  { key: 'beatleader', label: 'BeatLeader' },
  { key: 'scoresaber', label: 'ScoreSaber' },
]

const jobTypes = ref<JobTypeResponse[]>([])
const typesLoading = ref(true)
const typesError = ref<string | null>(null)

const jobs = ref<JobResponse[]>([])
const jobsLoading = ref(true)
const jobsError = ref<string | null>(null)

const submitting = ref(false)
const submitError = ref<string | null>(null)
const submitNotice = ref<string | null>(null)

let jobPoll: ReturnType<typeof setTimeout> | undefined

const jobLabels = computed(() => Object.fromEntries(jobTypes.value.map((t) => [t.type, t.label])))
const runningTypes = computed(() => jobs.value.filter((j) => j.status === 'RUNNING').map((j) => j.type))

async function loadJobTypes() {
  try {
    const { getJobTypes } = await import('@/api/admin/jobs')
    jobTypes.value = await getJobTypes()
  } catch (err) {
    typesError.value = describeFailure(err)
  } finally {
    typesLoading.value = false
  }
}

async function refreshJobs() {
  jobsLoading.value = true
  try {
    const { getJobs } = await import('@/api/admin/jobs')
    jobs.value = await getJobs()
    jobsError.value = null
  } catch (err) {
    jobsError.value = describeFailure(err)
  } finally {
    jobsLoading.value = false
    clearTimeout(jobPoll)
    if (runningTypes.value.length) jobPoll = setTimeout(() => void refreshJobs(), RUNNING_POLL_MS)
  }
}

async function submitJob(request: RunJobRequest) {
  submitting.value = true
  submitError.value = null
  submitNotice.value = null
  try {
    const { runJob } = await import('@/api/admin/jobs')
    const job = await runJob(request)
    submitNotice.value = `${jobLabels.value[job.type] ?? job.type} started`
    await refreshJobs()
  } catch (err) {
    submitError.value = describeFailure(err)
  } finally {
    submitting.value = false
  }
}

const sockets = ref<Record<string, unknown> | null>(null)
const socketsLoading = ref(true)
const reconnecting = ref<Platform | null>(null)

async function loadSockets() {
  socketsLoading.value = true
  try {
    const { getWsStatus } = await import('@/api/admin/recalculation')
    sockets.value = await getWsStatus()
  } catch {
    sockets.value = null
  } finally {
    socketsLoading.value = false
  }
}

async function reconnect(platform: Platform) {
  reconnecting.value = platform
  try {
    const { reconnectWs } = await import('@/api/admin/recalculation')
    await reconnectWs(platform)
    await loadSockets()
  } finally {
    reconnecting.value = null
  }
}

interface FeedState {
  connected?: boolean
  lastMessageReceivedAt?: string
  lastDisconnectedAt?: string
}

function isDate(value: string | undefined): value is string {
  return !!value && !Number.isNaN(Date.parse(value))
}

function socketState(platform: Platform): string {
  const state = sockets.value?.[platform] as FeedState | string | undefined
  if (state == null) return 'Unknown'
  if (typeof state === 'string') return state
  const parts = [state.connected ? 'Connected' : 'Disconnected']
  if (isDate(state.lastMessageReceivedAt)) parts.push(`last score ${formatRelativeDate(state.lastMessageReceivedAt)}`)
  if (isDate(state.lastDisconnectedAt)) parts.push(`last drop ${formatRelativeDate(state.lastDisconnectedAt)}`)
  return parts.join(', ')
}

void Promise.all([loadJobTypes(), refreshJobs(), loadSockets()])

onUnmounted(() => clearTimeout(jobPoll))
</script>

<template>
  <div class="jobs-tab">
    <p v-if="typesError" class="caption jobs-tab__error" role="alert">{{ typesError }}</p>

    <JobRunner :types="jobTypes" :loading="typesLoading" :running-types="runningTypes" :submitting="submitting"
      :error="submitError" :notice="submitNotice" @submit="submitJob" />

    <JobsList :jobs="jobs" :labels="jobLabels" :loading="jobsLoading" :error="jobsError" @refresh="refreshJobs" />

    <ToolCard title="Score Feeds">
      <template #head>
        <BaseButton size="sm" :loading="socketsLoading" @click="loadSockets">Refresh</BaseButton>
      </template>
      <div class="jobs-tab__feeds">
        <div v-for="platform in PLATFORMS" :key="platform.key" class="jobs-tab__feed">
          <span class="jobs-tab__feed-name">{{ platform.label }}</span>
          <span class="caption jobs-tab__feed-state">{{ socketState(platform.key) }}</span>
          <BaseButton size="sm" :loading="reconnecting === platform.key" @click="reconnect(platform.key)">Reconnect</BaseButton>
        </div>
      </div>
    </ToolCard>
  </div>
</template>

<style scoped>
.jobs-tab {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  min-width: 0;
}

.jobs-tab__error {
  color: var(--error);
}

.jobs-tab__feeds {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--space-sm) var(--space-xl);
}

.jobs-tab__feed {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  min-height: var(--control-h);
}

.jobs-tab__feed-name {
  font-weight: 600;
  color: var(--text-primary);
}

.jobs-tab__feed-state {
  flex: 1;
  min-width: 0;
  overflow-wrap: anywhere;
}
</style>
