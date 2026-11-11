<script setup lang="ts">
import { ApiError, parseApiError } from '@/api/client'
import BaseTabs from '@/components/common/BaseTabs.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import PaginationControls from '@/components/common/PaginationControls.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import MissionCard from '@/components/domain/MissionCard.vue'
import { useNow } from '@/composables/useNow'
import type { MissionPool, MissionResponse } from '@/types/api/missions'
import type { Tab } from '@/types/display'
import {
  BAND_RANK,
  POOL_LABEL,
  POOL_ORDER,
} from '@/utils/missions'
import { computed, ref, useId, watch } from 'vue'
import { formatDuration } from '@/utils/formatters'

const props = defineProps<{
  loadActive: () => Promise<MissionResponse[]>
  loadHistory: () => Promise<MissionResponse[]>
  hideTitle?: boolean
  selfView?: boolean
  hideEventPool?: boolean
}>()

const uid = useId()

const TABS: Tab[] = [
  { key: 'active', label: 'Active' },
  { key: 'history', label: 'History' },
]

const tab = ref('active')

const missionsById = ref(new Map<string, MissionResponse>())
const loadingActive = ref(false)
const loadingHistory = ref(false)
const loadedActive = ref(false)
const loadedHistory = ref(false)
const activeError = ref<string | null>(null)
const historyError = ref<string | null>(null)

const now = useNow(30_000)

const errorMessage = computed(() => activeError.value ?? historyError.value)

const allMissions = computed(() => {
  const list = Array.from(missionsById.value.values())
  return props.hideEventPool ? list.filter((m) => m.pool !== 'event') : list
})

const activeList = computed(() =>
  allMissions.value.filter((m) => isWithinWindow(m, now.value)),
)

const historyList = computed(() =>
  allMissions.value.filter((m) => !isWithinWindow(m, now.value)),
)

const hasActive = computed(() => activeList.value.length > 0)
const hasHistory = computed(() => historyList.value.length > 0)

const hasDaily = computed(() => activeList.value.some((m) => m.pool === 'daily'))

const showInactiveNotice = computed(
  () =>
    Boolean(props.selfView)
    && loadedActive.value
    && loadedHistory.value
    && !errorMessage.value
    && !hasDaily.value,
)

const grouped = computed(() => {
  const map = new Map<MissionPool, MissionResponse[]>()
  for (const pool of POOL_ORDER) map.set(pool, [])
  for (const m of activeList.value) {
    const bucket = map.get(m.pool)
    if (bucket) bucket.push(m)
  }
  return POOL_ORDER
    .map((pool) => ({ pool, missions: sortByBand(map.get(pool) ?? []) }))
    .filter((group) => group.missions.length > 0)
})

const sortedHistory = computed(() => sortByBand(historyList.value))

const HISTORY_PAGE_SIZE = 10
const historyPage = ref(1)

const historyTotalPages = computed(() =>
  Math.max(1, Math.ceil(sortedHistory.value.length / HISTORY_PAGE_SIZE)),
)

const pagedHistory = computed(() => {
  const start = (historyPage.value - 1) * HISTORY_PAGE_SIZE
  return sortedHistory.value.slice(start, start + HISTORY_PAGE_SIZE)
})

watch(historyTotalPages, (total) => {
  if (historyPage.value > total) historyPage.value = total
})

function expiryMs(mission: MissionResponse): number {
  return mission.expiresAt ? new Date(mission.expiresAt).getTime() : Number.NaN
}

function isWithinWindow(mission: MissionResponse, nowMs: number): boolean {
  const expiresAt = expiryMs(mission)
  if (!Number.isFinite(expiresAt)) return mission.status === 'active'
  return expiresAt > nowMs
}

function bandRank(mission: MissionResponse): number {
  return mission.band ? BAND_RANK[mission.band] : Number.MAX_SAFE_INTEGER
}

function sortByBand(missions: MissionResponse[]): MissionResponse[] {
  return [...missions].sort((a, b) => bandRank(a) - bandRank(b))
}

function groupCountdown(missions: MissionResponse[]): string {
  const earliest = missions
    .map(expiryMs)
    .filter((t) => Number.isFinite(t))
    .reduce((min, t) => (t < min ? t : min), Number.POSITIVE_INFINITY)
  if (!Number.isFinite(earliest)) return ''
  return formatDuration(earliest - now.value, { zero: 'expired' })
}

function isMissionsUnavailable(err: unknown): boolean {
  return err instanceof ApiError && (err.status === 401 || err.status === 404)
}

function mergeMissions(list: MissionResponse[]) {
  const next = new Map(missionsById.value)
  for (const m of list) next.set(m.id, m)
  missionsById.value = next
}

async function runLoadActive() {
  if (loadingActive.value) return
  loadingActive.value = true
  activeError.value = null
  try {
    mergeMissions(await props.loadActive())
  } catch (err) {
    if (!isMissionsUnavailable(err)) {
      activeError.value = parseApiError(err, 'Failed to load missions').message
    }
  } finally {
    loadingActive.value = false
    loadedActive.value = true
  }
}

async function runLoadHistory() {
  if (loadingHistory.value) return
  loadingHistory.value = true
  historyError.value = null
  try {
    mergeMissions(await props.loadHistory())
  } catch (err) {
    if (!isMissionsUnavailable(err)) {
      historyError.value = parseApiError(err, 'Failed to load history').message
    }
  } finally {
    loadingHistory.value = false
    loadedHistory.value = true
  }
}

void runLoadActive()
void runLoadHistory()
</script>

<template>
  <div class="missions-panel">
    <header class="missions-panel__head" :class="{ 'missions-panel__head--headless': hideTitle }">
      <h2 v-if="!hideTitle" class="missions-panel__title card-title">Missions</h2>
      <BaseTabs v-model="tab" :tabs="TABS" variant="segmented" label="Missions" :id-prefix="uid" />
    </header>

    <div class="missions-panel__body">
      <div v-if="errorMessage" class="missions-panel__error" role="alert">{{ errorMessage }}</div>

      <section v-show="tab === 'active'" :id="`${uid}-panel-active`" role="tabpanel"
        :aria-labelledby="`${uid}-tab-active`"
        tabindex="0" class="missions-panel__tabpanel">
        <div v-if="(loadingActive || loadingHistory) && !hasActive" class="missions-panel__skeletons">
          <SkeletonLoader v-for="i in 4" :key="i" width="100%" height="64px" />
        </div>
        <template v-else>
          <div v-if="showInactiveNotice" class="missions-panel__notice" role="status">
            Daily missions are paused, play a ranked map and log in again
          </div>
          <EmptyState v-if="!hasActive && !showInactiveNotice && !errorMessage" message="No active missions" />
          <div v-else-if="hasActive" class="missions-panel__groups">
            <section v-for="group in grouped" :key="group.pool" class="missions-panel__group">
              <header class="missions-panel__group-head">
                <span class="missions-panel__group-label">{{ POOL_LABEL[group.pool] }}</span>
                <span class="caption">resets in {{ groupCountdown(group.missions) }}</span>
              </header>
              <div class="missions-panel__stack">
                <MissionCard v-for="mission in group.missions" :key="mission.id" :mission="mission" />
              </div>
            </section>
          </div>
        </template>
      </section>

      <section v-show="tab === 'history'" :id="`${uid}-panel-history`" role="tabpanel"
        :aria-labelledby="`${uid}-tab-history`"
        tabindex="0" class="missions-panel__tabpanel">
        <div v-if="(loadingActive || loadingHistory) && !hasHistory" class="missions-panel__skeletons">
          <SkeletonLoader v-for="i in 4" :key="i" width="100%" height="64px" />
        </div>
        <EmptyState v-else-if="!loadingActive && !loadingHistory && !hasHistory && !errorMessage"
          message="No completed missions" />
        <template v-else>
          <div class="missions-panel__stack">
            <MissionCard v-for="mission in pagedHistory" :key="mission.id" :mission="mission" />
          </div>
          <div v-if="historyTotalPages > 1" class="missions-panel__pagination">
            <PaginationControls :page="historyPage" :total-pages="historyTotalPages"
              @update:page="historyPage = $event" />
          </div>
        </template>
      </section>
    </div>
  </div>
</template>

<style scoped>
.missions-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.missions-panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
  padding: var(--space-sm) var(--space-md);
}

.missions-panel__head--headless {
  justify-content: flex-end;
}

.missions-panel__tabpanel:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--accent) 40%, transparent);
  outline-offset: -2px;
}

.missions-panel__title {
  font-family: var(--font-sans);
}

.missions-panel__body {
  overflow-y: auto;
  flex: 1;
  min-height: 0;
  padding-bottom: var(--space-sm);
}

.missions-panel__error {
  margin: var(--space-sm) var(--space-md);
  padding: var(--space-sm) var(--space-md);
  font-size: var(--text-caption);
  color: var(--error);
  background: color-mix(in srgb, var(--error) 8%, transparent);
  border-radius: var(--radius-btn);
}

.missions-panel__notice {
  margin: var(--space-sm) var(--space-md) 0;
  padding: var(--space-sm) var(--space-md);
  font-size: var(--text-caption);
  color: var(--warning);
  background: color-mix(in srgb, var(--warning) 8%, transparent);
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

.missions-panel__group+.missions-panel__group {
  margin-top: var(--space-sm);
}

.missions-panel__group-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md) var(--space-xs);
}

.missions-panel__group-label {
  font-weight: 600;
  color: var(--text-secondary);
}

.missions-panel__stack {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.missions-panel__pagination {
  padding: var(--space-md);
}
</style>
