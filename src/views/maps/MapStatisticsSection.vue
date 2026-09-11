<script setup lang="ts">
import TimeSeriesChart from '@/components/domain/TimeSeriesChart.vue'
import type { MapComplexityHistoryResponse, MapDifficultyStatisticsResponse, TopScoreSnapshot } from '@/types/api/maps'
import type { DifficultyScoreDisplay, MetricType, TimeRange, TimeSeriesPoint } from '@/types/display'
import { MAP_STATS_METRICS, TIME_RANGE_PARAMS } from '@/utils/constants'
import { formatRelativeDate } from '@/utils/formatters'
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
    userName: score.userName,
    avatarUrl: score.avatarFallbackUrl ?? score.avatarUrl,
    cdnAvatarUrl: score.avatarFallbackUrl ? score.avatarUrl : null,
    score: score.score,
    accuracy: score.accuracy,
    ap: score.ap,
    timeSet: score.date,
  }
}

function handleTopAvatarError(entry: TopScoreSnapshot, event: Event) {
  const img = event.currentTarget as HTMLImageElement
  if (entry.cdnAvatarUrl && entry.avatarUrl && img.src !== entry.avatarUrl) {
    img.src = entry.avatarUrl
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

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
}

async function fetchHistoricStats() {
  if (!props.difficultyId) {
    historicStats.value = []
    return
  }
  try {
    const { getDifficultyStatisticsHistoric } = await import('@/api/maps')
    const params = TIME_RANGE_PARAMS[selectedRange.value]
    historicStats.value = await getDifficultyStatisticsHistoric(props.difficultyId, params)
  } catch {
    historicStats.value = []
  }
}

async function fetchComplexityHistory() {
  if (!props.mapId) {
    complexityHistory.value = []
    return
  }
  try {
    const { getComplexityHistory } = await import('@/api/maps')
    complexityHistory.value = await getComplexityHistory(props.mapId)
  } catch {
    complexityHistory.value = []
  }
}

watch(() => props.difficultyId, fetchHistoricStats, { immediate: true })
watch(() => props.mapId, fetchComplexityHistory, { immediate: true })
watch(selectedRange, fetchHistoricStats)
</script>

<template>
  <div class="map-stats">
    <section v-if="topScoreHistory.length > 0" class="map-stats__section">
      <h2 class="map-stats__heading">#1 History</h2>
      <div class="map-stats__top-history">
        <template v-for="item in topHistoryItems" :key="item.key">
          <div v-if="item.kind === 'score'" class="map-stats__top-row"
            :class="{ 'map-stats__top-row--current': item.current }" tabindex="0" role="button"
            @click="emit('navigate-player', item.entry.userId)"
            @keydown.enter="emit('navigate-player', item.entry.userId)">
            <img class="map-stats__top-avatar" :src="item.entry.cdnAvatarUrl ?? item.entry.avatarUrl"
              :alt="item.entry.userName" loading="lazy" decoding="async"
              @error="handleTopAvatarError(item.entry, $event)" />
            <span class="map-stats__top-name">{{ item.entry.userName }}</span>
            <span class="map-stats__top-acc">{{ (item.entry.accuracy * 100).toFixed(2) }}%</span>
            <span class="map-stats__top-ap">{{ item.entry.ap.toFixed(2) }} AP</span>
            <span class="map-stats__top-date">{{ formatRelativeDate(item.entry.timeSet) }}</span>
          </div>
          <div v-else class="map-stats__break"
            :class="item.change.type === 'BUFF' ? 'map-stats__break--buff' : 'map-stats__break--nerf'">
            <span class="map-stats__break-tag">{{ item.change.type === 'BUFF' ? '↑ BUFF' : '↓ NERF' }}</span>
            <span class="map-stats__break-val">{{ item.change.from.toFixed(1) }} → {{ item.change.to.toFixed(1) }}</span>
            <span class="map-stats__break-date">{{ formatDate(item.change.date) }}</span>
          </div>
        </template>
      </div>
    </section>

    <section v-if="complexityChanges.length > 0" class="map-stats__section">
      <h2 class="map-stats__heading">Complexity History</h2>
      <div class="map-stats__complexity-list">
        <div v-for="(change, i) in complexityChanges" :key="i" class="map-stats__complexity-entry">
          <span class="map-stats__complexity-date">{{ formatDate(change.date) }}</span>
          <template v-if="change.type === 'INITIAL'">
            <span class="map-stats__complexity-val">{{ change.to.toFixed(1) }}</span>
            <span class="map-stats__complexity-tag map-stats__complexity-tag--initial">INITIAL</span>
          </template>
          <template v-else>
            <span class="map-stats__complexity-val">{{ change.from.toFixed(1) }} → {{ change.to.toFixed(1) }}</span>
            <span class="map-stats__complexity-tag"
              :class="change.type === 'BUFF' ? 'map-stats__complexity-tag--buff' : 'map-stats__complexity-tag--nerf'">
              {{ change.type === 'BUFF' ? '↑ BUFF' : '↓ NERF' }}
            </span>
          </template>
        </div>
      </div>
    </section>

    <section v-if="difficultyId" class="map-stats__section">
      <h2 class="map-stats__heading">Statistics Over Time</h2>
      <TimeSeriesChart :data="statsChartPoints" :metric-label="selectedMetricLabel" :accent-color="accentColor"
        :available-metrics="MAP_STATS_METRICS" :selected-metric="selectedMetric" :selected-range="selectedRange"
        @update:selected-metric="selectedMetric = $event as MetricType"
        @update:selected-range="selectedRange = $event" />
    </section>
  </div>
</template>

<style scoped>
.map-stats {
  display: flex;
  flex-direction: column;
}

.map-stats__section {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  margin-bottom: var(--space-xl);
}

.map-stats__heading {
  font-size: var(--text-section);
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.map-stats__top-history {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.map-stats__top-row {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  cursor: pointer;
  padding: var(--space-xs) var(--space-md);
  border-radius: var(--radius-btn);
  transition: background 120ms ease;
}

.map-stats__top-row:hover {
  background: var(--bg-elevated);
}

.map-stats__top-row--current {
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
}

.map-stats__top-avatar {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-btn);
  object-fit: cover;
  flex-shrink: 0;
}

.map-stats__top-name {
  font-size: var(--text-body);
  font-weight: 500;
  color: var(--text-primary);
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.map-stats__top-acc {
  font-family: var(--font-mono);
  font-size: var(--text-body);
  color: var(--text-primary);
  flex-shrink: 0;
}

.map-stats__top-ap {
  font-family: var(--font-mono);
  font-size: var(--text-body);
  color: var(--page-accent, var(--accent));
  flex-shrink: 0;
}

.map-stats__top-date {
  font-size: var(--text-caption);
  color: var(--text-tertiary);
  flex-shrink: 0;
}

.map-stats__break {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: 0 var(--space-md);
  margin: var(--space-xs) 0;
}

.map-stats__break::after {
  content: '';
  flex: 1;
  height: 1px;
  background: color-mix(in srgb, currentColor 45%, transparent);
}

.map-stats__break--buff {
  color: var(--success);
}

.map-stats__break--nerf {
  color: var(--error);
}

.map-stats__break-tag {
  font-size: var(--text-caption);
  font-weight: 700;
  letter-spacing: 0.04em;
}

.map-stats__break-val {
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

.map-stats__break-date {
  font-size: var(--text-caption);
  color: var(--text-tertiary);
}

.map-stats__complexity-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.map-stats__complexity-entry {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-surface);
  border-radius: var(--radius-btn);
}

.map-stats__complexity-date {
  font-size: var(--text-caption);
  color: var(--text-tertiary);
  min-width: 100px;
}

.map-stats__complexity-val {
  font-family: var(--font-mono);
  font-size: var(--text-body);
  color: var(--text-primary);
}

.map-stats__complexity-tag {
  font-size: var(--text-caption);
  font-weight: 600;
  padding: 1px var(--space-sm);
  border-radius: var(--radius-pill);
}

.map-stats__complexity-tag--initial {
  color: var(--text-secondary);
  background: var(--bg-elevated);
}

.map-stats__complexity-tag--buff {
  color: var(--success);
  background: color-mix(in srgb, var(--success) 15%, transparent);
}

.map-stats__complexity-tag--nerf {
  color: var(--error);
  background: color-mix(in srgb, var(--error) 15%, transparent);
}

@media (max-width: 767px) {
  .map-stats__top-row {
    flex-wrap: wrap;
  }
}
</style>
