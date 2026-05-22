<script setup lang="ts">
import BaseDropdown from '@/components/common/BaseDropdown.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import MissionCard from '@/components/domain/MissionCard.vue'
import { ApiError, getApiErrorMessage } from '@/api/client'
import { getDifficulty } from '@/api/maps'
import { getMyCompletedMissions, getMyMissions } from '@/api/missions'
import type { MissionPool, UserMissionResponse } from '@/types/api/missions'
import {
  BAND_RANK,
  formatMissionCountdown,
  POOL_LABEL,
  POOL_ORDER,
} from '@/utils/missions'
import { computed, onUnmounted, ref, watch } from 'vue'

const open = ref(false)
const tab = ref<'active' | 'history'>('active')

const activeMissions = ref<UserMissionResponse[] | null>(null)
const completedMissions = ref<UserMissionResponse[] | null>(null)
const loadingActive = ref(false)
const loadingHistory = ref(false)
const errorMessage = ref<string | null>(null)

const mapIdByDifficulty = ref(new Map<string, string>())

const now = ref(Date.now())
let nowTimer: number | null = null

const hasActive = computed(() => (activeMissions.value?.length ?? 0) > 0)
const hasHistory = computed(() => (completedMissions.value?.length ?? 0) > 0)

const grouped = computed(() => {
  const list = activeMissions.value ?? []
  const map = new Map<MissionPool, UserMissionResponse[]>()
  for (const pool of POOL_ORDER) map.set(pool, [])
  for (const m of list) {
    const bucket = map.get(m.pool)
    if (bucket) bucket.push(m)
  }
  return POOL_ORDER
    .map((pool) => ({ pool, missions: sortByBand(map.get(pool) ?? []) }))
    .filter((group) => group.missions.length > 0)
})

const sortedHistory = computed(() => sortByBand(completedMissions.value ?? []))

function sortByBand(missions: UserMissionResponse[]): UserMissionResponse[] {
  return [...missions].sort((a, b) => BAND_RANK[a.band] - BAND_RANK[b.band])
}

function groupCountdown(missions: UserMissionResponse[]): string {
  const earliest = missions
    .map((m) => new Date(m.expiresAt).getTime())
    .filter((t) => Number.isFinite(t))
    .reduce((min, t) => (t < min ? t : min), Number.POSITIVE_INFINITY)
  if (!Number.isFinite(earliest)) return ''
  return formatMissionCountdown(new Date(earliest).toISOString(), now.value)
}

function isMissionsUnavailable(err: unknown): boolean {
  return err instanceof ApiError && (err.status === 401 || err.status === 404)
}

async function resolveMapIds(missions: UserMissionResponse[]) {
  const pending = new Set<string>()
  for (const m of missions) {
    const diffId = m.targetMapDifficultyId
    if (diffId && !mapIdByDifficulty.value.has(diffId)) pending.add(diffId)
  }
  if (pending.size === 0) return
  const results = await Promise.allSettled(
    Array.from(pending).map((id) => getDifficulty(id).then((d) => [id, d.mapId] as const)),
  )
  const next = new Map(mapIdByDifficulty.value)
  for (const r of results) {
    if (r.status === 'fulfilled') next.set(r.value[0], r.value[1])
  }
  mapIdByDifficulty.value = next
}

async function loadActive() {
  loadingActive.value = true
  errorMessage.value = null
  try {
    const missions = await getMyMissions()
    activeMissions.value = missions
    void resolveMapIds(missions)
  } catch (err) {
    if (isMissionsUnavailable(err)) {
      activeMissions.value = []
    } else {
      errorMessage.value = getApiErrorMessage(err, 'Failed to load missions')
    }
  } finally {
    loadingActive.value = false
  }
}

async function loadHistory() {
  loadingHistory.value = true
  errorMessage.value = null
  try {
    const missions = await getMyCompletedMissions()
    completedMissions.value = missions
    void resolveMapIds(missions)
  } catch (err) {
    if (isMissionsUnavailable(err)) {
      completedMissions.value = []
    } else {
      errorMessage.value = getApiErrorMessage(err, 'Failed to load history')
    }
  } finally {
    loadingHistory.value = false
  }
}

function startTicker() {
  if (nowTimer !== null) return
  now.value = Date.now()
  nowTimer = window.setInterval(() => {
    now.value = Date.now()
  }, 30_000)
}

function stopTicker() {
  if (nowTimer !== null) {
    window.clearInterval(nowTimer)
    nowTimer = null
  }
}

function handleNavigate() {
  open.value = false
}

watch(open, (value) => {
  if (value) {
    startTicker()
    if (tab.value === 'active') void loadActive()
    else if (completedMissions.value === null) void loadHistory()
  } else {
    stopTicker()
  }
})

watch(tab, (value) => {
  if (!open.value) return
  if (value === 'active' && !loadingActive.value) void loadActive()
  if (value === 'history' && completedMissions.value === null) void loadHistory()
})

onUnmounted(() => {
  stopTicker()
})
</script>

<template>
  <BaseDropdown v-model:open="open" position="bottom-right">
    <template #trigger>
      <button
        type="button"
        class="navbar__icon-btn missions-trigger"
        :class="{ 'missions-trigger--active': open }"
        aria-label="Missions"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="6" />
          <circle cx="12" cy="12" r="2" />
        </svg>
      </button>
    </template>

    <div class="missions-panel">
      <header class="missions-panel__head">
        <h2 class="missions-panel__title">Missions</h2>
        <div class="missions-panel__tabs" role="tablist">
          <button
            type="button"
            role="tab"
            class="missions-panel__tab"
            :class="{ 'missions-panel__tab--active': tab === 'active' }"
            :aria-selected="tab === 'active'"
            @click="tab = 'active'"
          >Active</button>
          <button
            type="button"
            role="tab"
            class="missions-panel__tab"
            :class="{ 'missions-panel__tab--active': tab === 'history' }"
            :aria-selected="tab === 'history'"
            @click="tab = 'history'"
          >History</button>
        </div>
      </header>

      <div class="missions-panel__body">
        <div v-if="errorMessage" class="missions-panel__error">{{ errorMessage }}</div>

        <template v-if="tab === 'active'">
          <div v-if="loadingActive && !hasActive" class="missions-panel__skeletons">
            <SkeletonLoader variant="card" />
            <SkeletonLoader variant="card" />
          </div>
          <EmptyState
            v-else-if="!loadingActive && !hasActive && !errorMessage"
            icon="🎆"
            message="No active missions right now. Check back at the next rollover."
          />
          <div v-else class="missions-panel__groups">
            <section
              v-for="group in grouped"
              :key="group.pool"
              class="missions-panel__group"
            >
              <header class="missions-panel__group-head">
                <span class="missions-panel__group-label">{{ POOL_LABEL[group.pool] }}</span>
                <span class="missions-panel__group-meta">resets in {{ groupCountdown(group.missions) }}</span>
              </header>
              <div class="missions-panel__stack">
                <MissionCard
                  v-for="mission in group.missions"
                  :key="mission.id"
                  :mission="mission"
                  :map-id="mission.targetMapDifficultyId ? mapIdByDifficulty.get(mission.targetMapDifficultyId) ?? null : null"
                  @navigate="handleNavigate"
                />
              </div>
            </section>
          </div>
        </template>

        <template v-else>
          <div v-if="loadingHistory && !hasHistory" class="missions-panel__skeletons">
            <SkeletonLoader variant="card" />
            <SkeletonLoader variant="card" />
          </div>
          <EmptyState
            v-else-if="!loadingHistory && !hasHistory && !errorMessage"
            icon="🏁"
            message="Completed missions will show up here."
          />
          <div v-else class="missions-panel__stack">
            <MissionCard
              v-for="mission in sortedHistory"
              :key="mission.id"
              :mission="mission"
              :map-id="mission.targetMapDifficultyId ? mapIdByDifficulty.get(mission.targetMapDifficultyId) ?? null : null"
              @navigate="handleNavigate"
            />
          </div>
        </template>
      </div>
    </div>
  </BaseDropdown>
</template>

<style scoped>
.missions-trigger--active {
  color: var(--text-primary);
  background: var(--bg-elevated);
}

:deep(.base-dropdown__panel) {
  width: min(440px, calc(100vw - 32px));
  min-width: unset;
  padding: 0;
  background: color-mix(in srgb, var(--bg-elevated) 96%, transparent);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35);
}

.missions-panel {
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - var(--navbar-height) - 24px);
}

.missions-panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
  padding: var(--space-sm) var(--space-md);
  border-bottom: 1px solid var(--bg-overlay);
}

.missions-panel__title {
  margin: 0;
  font-family: var(--font-sans);
  font-size: var(--text-card-title);
  font-weight: 700;
  color: var(--text-primary);
}

.missions-panel__tabs {
  display: flex;
  gap: 2px;
  padding: 2px;
  background: var(--bg-base);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-btn);
}

.missions-panel__tab {
  padding: 4px var(--space-sm);
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--text-secondary);
  background: none;
  border: none;
  border-radius: 2px;
  cursor: pointer;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  transition: color 120ms ease, background 120ms ease;
}

.missions-panel__tab:hover {
  color: var(--text-primary);
}

.missions-panel__tab--active {
  color: var(--text-primary);
  background: var(--bg-elevated);
}

.missions-panel__body {
  overflow-y: auto;
  flex: 1;
}

.missions-panel__error {
  margin: var(--space-sm) var(--space-md);
  padding: var(--space-sm) var(--space-md);
  font-size: var(--text-caption);
  color: var(--error);
  background: color-mix(in srgb, var(--error) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--error) 40%, transparent);
  border-radius: var(--radius-btn);
}

.missions-panel__skeletons {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  padding: var(--space-md);
}

.missions-panel__groups {
  display: flex;
  flex-direction: column;
}

.missions-panel__group {
  display: flex;
  flex-direction: column;
}

.missions-panel__group + .missions-panel__group {
  border-top: 1px solid var(--bg-overlay);
}

.missions-panel__group-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md) 4px;
}

.missions-panel__group-label {
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.16em;
}

.missions-panel__group-meta {
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  color: var(--text-tertiary);
}

.missions-panel__stack {
  display: flex;
  flex-direction: column;
}

@media (max-width: 600px) {
  :deep(.base-dropdown__panel) {
    position: fixed;
    top: calc(var(--navbar-height) + var(--space-xs));
    left: var(--space-md);
    right: var(--space-md);
    width: auto;
    max-width: none;
    margin: 0;
  }

  .missions-panel {
    max-height: calc(100vh - var(--navbar-height) - var(--space-md) - var(--space-xs));
  }
}
</style>
