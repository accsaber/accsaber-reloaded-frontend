<script setup lang="ts">
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import TimeSeriesChart from '@/components/domain/TimeSeriesChart.vue'
import UserChip from '@/components/domain/UserChip.vue'
import type { MapComplexityHistoryResponse, MapDifficultyStatisticsResponse, TopScoreSnapshot } from '@/types/api/maps'
import type { ChartMarker, DifficultyScoreDisplay, MetricType, TimeRange, TimeSeriesPoint } from '@/types/display'
import { MAP_STATS_METRICS, TIME_RANGE_PARAMS } from '@/utils/constants'
import { formatAccuracy, formatRelativeDate, formatShortDate } from '@/utils/formatters'
import { toUserRef } from '@/utils/mappers'
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  difficultyId: string
  mapId?: string
  accentColor: string
  topScoresFirstPage: DifficultyScoreDisplay[]
}>()

const emit = defineEmits<{
  'navigate-player': [userId: string]
}>()

const historicStats = ref<MapDifficultyStatisticsResponse[]>([])
const complexityHistory = ref<MapComplexityHistoryResponse[]>([])
const statsLoading = ref(true)
const complexityLoading = ref(true)
const selectedMetric = ref<MetricType>('ap')
const selectedRange = ref<TimeRange>('30d')

const selectedMetricLabel = computed(
  () => MAP_STATS_METRICS.find((m) => m.key === selectedMetric.value)?.label ?? '',
)

const statsChartPoints = computed<TimeSeriesPoint[]>(() => {
  const metric = selectedMetric.value
  return historicStats.value
    .filter((s) => s.totalScores > 0)
    .map((s) => ({
      timestamp: new Date(s.createdAt).getTime(),
      value: metric === 'ap' ? s.maxAp
        : metric === 'avgAp' ? s.averageAp
        : s.totalScores,
    }))
    .filter((p) => p.value != null && Number.isFinite(p.value))
    .sort((a, b) => a.timestamp - b.timestamp)
})

function snapshotFromScore(score: DifficultyScoreDisplay): TopScoreSnapshot {
  return {
    scoreId: score.id,
    userId: score.userId,
    userName: score.player.name,
    avatarUrl: score.player.avatarUrl ?? '',
    cdnAvatarUrl: score.player.cdnAvatarUrl ?? null,
    clan: score.player.clan ?? null,
    score: score.score,
    accuracy: score.accuracy,
    ap: score.ap,
    timeSet: score.date,
  }
}

const topScoreHistory = computed<TopScoreSnapshot[]>(() => {
  const sorted = [...historicStats.value].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  )
  const seen = new Set<string>()
  const entries: TopScoreSnapshot[] = []
  const knownAps: number[] = []

  for (const stat of sorted) {
    const snapshot = stat.topScore
    if (snapshot && !seen.has(snapshot.scoreId)) {
      seen.add(snapshot.scoreId)
      knownAps.push(snapshot.ap)
      entries.push(snapshot)
    }
  }

  const triedAps: number[] = []
  for (const stat of sorted) {
    if (stat.topScore || stat.maxAp == null) continue
    const ap = stat.maxAp
    if (triedAps.some((t) => Math.abs(t - ap) < 0.005)) continue
    triedAps.push(ap)
    if (knownAps.some((k) => Math.abs(k - ap) < 0.005)) continue
    const matched = props.topScoresFirstPage.find((s) => Math.abs(s.ap - ap) < 0.005)
    if (matched && !seen.has(matched.id)) {
      seen.add(matched.id)
      entries.push(snapshotFromScore(matched))
    }
  }

  entries.sort((a, b) => new Date(a.timeSet).getTime() - new Date(b.timeSet).getTime())
  return entries.reverse()
})

interface ComplexityChange {
  date: string
  from: number
  to: number
  type: 'BUFF' | 'NERF' | 'INITIAL'
}

const complexityChanges = computed<ComplexityChange[]>(() => {
  const filtered = complexityHistory.value.filter((h) => h.mapDifficultyId === props.difficultyId)
  if (filtered.length === 0) return []
  const sorted = [...filtered].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  )
  const changes: ComplexityChange[] = []
  for (let i = 0; i < sorted.length; i++) {
    const entry = sorted[i]
    if (i === 0) {
      changes.push({ date: entry.createdAt, from: entry.complexity, to: entry.complexity, type: 'INITIAL' })
    } else {
      const prev = sorted[i - 1]
      changes.push({
        date: entry.createdAt,
        from: prev.complexity,
        to: entry.complexity,
        type: entry.complexity > prev.complexity ? 'BUFF' : 'NERF',
      })
    }
  }
  return changes.reverse()
})

const reweightMarkers = computed<ChartMarker[]>(() => {
  if (selectedMetric.value === 'rankedPlays') return []
  return complexityChanges.value
    .filter((c) => c.type !== 'INITIAL')
    .map((c) => ({
      timestamp: new Date(c.date).getTime(),
      lines: [`Reweighted ${c.from.toFixed(1)} → ${c.to.toFixed(1)}`],
      tone: c.type === 'BUFF' ? 'up' : 'down',
    }))
})

const CHANGE_LABEL: Record<ComplexityChange['type'], string> = {
  BUFF: 'Buff',
  NERF: 'Nerf',
  INITIAL: 'Initial',
}

type TopHistoryItem =
  | { kind: 'score'; key: string; entry: TopScoreSnapshot; current: boolean }
  | { kind: 'break'; key: string; change: ComplexityChange }

const topHistoryItems = computed<TopHistoryItem[]>(() => {
  const scores = topScoreHistory.value
  if (scores.length === 0) return []
  const breaks = complexityChanges.value.filter((c) => c.type !== 'INITIAL')
  const oldest = new Date(scores[scores.length - 1].timeSet).getTime()
  const items: TopHistoryItem[] = []
  let b = 0

  for (let i = 0; i < scores.length; i++) {
    const entry = scores[i]
    const setAt = new Date(entry.timeSet).getTime()
    while (b < breaks.length && new Date(breaks[b].date).getTime() > setAt) {
      const change = breaks[b++]
      items.push({ kind: 'break', key: `b${change.date}`, change })
    }
    items.push({ kind: 'score', key: entry.scoreId, entry, current: i === 0 })
  }

  return items.filter((item) => item.kind === 'score' || new Date(item.change.date).getTime() > oldest)
})

let historicRequest = 0
let complexityRequest = 0

async function fetchHistoricStats() {
  const request = ++historicRequest
  if (!props.difficultyId) {
    historicStats.value = []
    statsLoading.value = false
    return
  }
  let next: typeof historicStats.value = []
  try {
    const { getDifficultyStatisticsHistoric } = await import('@/api/maps')
    next = await getDifficultyStatisticsHistoric(props.difficultyId, TIME_RANGE_PARAMS[selectedRange.value])
  } catch {
    next = []
  }
  if (request !== historicRequest) return
  historicStats.value = next
  statsLoading.value = false
}

async function fetchComplexityHistory() {
  const request = ++complexityRequest
  if (!props.mapId) {
    complexityHistory.value = []
    complexityLoading.value = false
    return
  }
  let next: typeof complexityHistory.value = []
  try {
    const { getComplexityHistory } = await import('@/api/maps')
    next = await getComplexityHistory(props.mapId)
  } catch {
    next = []
  }
  if (request !== complexityRequest) return
  complexityHistory.value = next
  complexityLoading.value = false
}

watch(() => props.difficultyId, () => {
  statsLoading.value = true
  fetchHistoricStats()
}, { immediate: true })
watch(() => props.mapId, fetchComplexityHistory, { immediate: true })
watch(selectedRange, fetchHistoricStats)
</script>

<template>
  <div class="map-stats">
    <section v-if="difficultyId" class="map-stats__section map-stats__chart" aria-label="Statistics over time">
      <TimeSeriesChart :data="statsChartPoints" :metric-label="selectedMetricLabel" :accent-color="accentColor"
        :available-metrics="MAP_STATS_METRICS" :selected-metric="selectedMetric" :selected-range="selectedRange"
        :markers="reweightMarkers" :loading="statsLoading"
        @update:selected-metric="selectedMetric = $event as MetricType"
        @update:selected-range="selectedRange = $event" />
    </section>

    <div class="map-stats__side">
      <section v-if="statsLoading || topScoreHistory.length > 0" class="map-stats__section">
        <h2 class="section-title">#1 History</h2>
        <div v-if="statsLoading" class="map-stats__list">
          <SkeletonLoader v-for="i in 5" :key="i" height="40px" />
        </div>
        <div v-else class="map-stats__list stagger" :style="{ '--n': topHistoryItems.length }">
          <template v-for="(item, i) in topHistoryItems" :key="item.key">
            <div v-if="item.kind === 'score'" class="map-stats__top-row"
              :class="{ 'map-stats__top-row--current': item.current }" :style="{ '--i': i }" tabindex="0"
              role="button" @click="emit('navigate-player', item.entry.userId)"
              @keydown.enter="emit('navigate-player', item.entry.userId)">
              <UserChip :user="toUserRef(item.entry)" class="map-stats__top-player" />
              <span class="map-stats__top-acc">{{ formatAccuracy(item.entry.accuracy) }}</span>
              <span class="map-stats__top-ap">{{ item.entry.ap.toFixed(2) }} AP</span>
              <span class="map-stats__top-date">{{ formatRelativeDate(item.entry.timeSet) }}</span>
            </div>
            <div v-else class="map-stats__break" :class="`map-stats__tone--${item.change.type.toLowerCase()}`"
              :style="{ '--i': i }">
              <span class="map-stats__tone-label">{{ CHANGE_LABEL[item.change.type] }}</span>
              <span class="map-stats__break-val">{{ item.change.from.toFixed(1) }} → {{ item.change.to.toFixed(1) }}</span>
              <span class="map-stats__break-val">{{ formatShortDate(item.change.date) }}</span>
            </div>
          </template>
        </div>
      </section>

      <section v-if="complexityLoading || complexityChanges.length > 0" class="map-stats__section">
        <h2 class="section-title">Complexity History</h2>
        <div v-if="complexityLoading" class="map-stats__list">
          <SkeletonLoader v-for="i in 2" :key="i" height="24px" />
        </div>
        <div v-else class="map-stats__list stagger" :style="{ '--n': complexityChanges.length }">
          <div v-for="(change, i) in complexityChanges" :key="change.date" class="map-stats__complexity-entry"
            :style="{ '--i': i }">
            <span class="map-stats__complexity-date">{{ formatShortDate(change.date) }}</span>
            <span class="map-stats__complexity-val">
              <template v-if="change.type !== 'INITIAL'">{{ change.from.toFixed(1) }} → </template>{{ change.to.toFixed(1) }}
            </span>
            <span class="map-stats__tone-label" :class="`map-stats__tone--${change.type.toLowerCase()}`">
              {{ CHANGE_LABEL[change.type] }}
            </span>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.map-stats {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 440px;
  align-items: start;
  gap: var(--space-2xl);
}

.map-stats__side,
.map-stats__section {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.map-stats__side {
  gap: var(--space-2xl);
}

.map-stats__section {
  gap: var(--space-md);
}

.map-stats__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.map-stats__top-row {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  min-height: 40px;
  padding: var(--space-xs) var(--space-sm);
  border-radius: var(--radius-btn);
  cursor: pointer;
  transition: background-color var(--dur-fast) var(--ease-out);
}

.map-stats__top-row:hover {
  background: var(--bg-elevated);
}

.map-stats__top-row--current {
  background: var(--bg-surface);
}

.map-stats__top-player {
  flex: 1;
  min-width: 0;
}

.map-stats__top-acc,
.map-stats__top-ap {
  flex-shrink: 0;
  font-family: var(--font-mono);
  font-size: var(--text-body);
  color: var(--text-primary);
}

.map-stats__top-ap {
  color: var(--page-accent, var(--accent));
}

.map-stats__top-date {
  flex-shrink: 0;
  min-width: 7ch;
  font-size: var(--text-caption);
  color: var(--text-secondary);
  text-align: end;
}

.map-stats__break {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: 0 var(--space-sm);
}

.map-stats__tone--buff {
  color: var(--success);
}

.map-stats__tone--nerf {
  color: var(--error);
}

.map-stats__tone--initial {
  color: var(--text-secondary);
}

.map-stats__tone-label {
  font-size: var(--text-caption);
  font-weight: 600;
}

.map-stats__break-val {
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

.map-stats__complexity-entry {
  display: flex;
  align-items: baseline;
  gap: var(--space-md);
  min-height: 24px;
  padding: 0 var(--space-sm);
}

.map-stats__complexity-date {
  min-width: 100px;
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

.map-stats__complexity-val {
  font-family: var(--font-mono);
  font-size: var(--text-body);
  color: var(--text-primary);
}

@media (max-width: 1023px) {
  .map-stats {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
