<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import CoverImage from '@/components/common/CoverImage.vue'
import HintTooltip from '@/components/common/HintTooltip.vue'
import StatBlock from '@/components/common/StatBlock.vue'
import ComplexityBadge from '@/components/domain/ComplexityBadge.vue'
import DifficultyBadge from '@/components/domain/DifficultyBadge.vue'
import LevelBadge from '@/components/domain/LevelBadge.vue'
import ThumbnailBackdrop from '@/components/cosmetics/thumbnails/ThumbnailBackdrop.vue'
import SongTitle from '@/components/domain/SongTitle.vue'
import TimeSeriesChart from '@/components/domain/TimeSeriesChart.vue'
import UserChip from '@/components/domain/UserChip.vue'
import { useColorExtract } from '@/composables/useColorExtract'
import { useAppearance } from '@/composables/useAppearance'
import { useCategoryStore } from '@/stores/categories'
import { useThemeStore } from '@/stores/theme'
import type {
  EquippedItemsResponse,
} from '@/types/api/items'
import type {
  LevelResponse,
  ScoreResponse,
  UserResponse,
} from '@/types/api/users'
import type { PublicMapDifficultyResponse } from '@/types/api/maps'
import type { MetricType, ScoreDisplay, TimeRange, TimeSeriesPoint, UserRefDisplay } from '@/types/display'
import { brightenRgb } from '@/utils/color'
import { DAY_MS, HOUR_MS, SCORE_DETAIL_METRICS, TIME_RANGE_PARAMS } from '@/utils/constants'
import { formatRelativeDate, formatAccuracy } from '@/utils/formatters'
import { useEquippedRenderProps } from '@/composables/useEquippedRenderProps'
import { buildMapRoute } from '@/utils/mapRoute'
import { resolveReplayChain } from '@/utils/replay'
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { pickAvatarUrl } from '@/utils/media'

export interface ScoreDetailPlayer {
  user: UserResponse | null
  level: LevelResponse | null
  equipped: EquippedItemsResponse
}

const props = defineProps<{
  open: boolean
  score: ScoreDisplay | null
  userId: string
  player?: ScoreDetailPlayer | null
}>()

const emit = defineEmits<{
  close: []
}>()

type ScoreMetric = 'accuracy' | 'ap' | 'xpCumulative' | 'xpPerAttempt'

const router = useRouter()
const themeStore = useThemeStore()
const categoryStore = useCategoryStore()
const { primaryReplayService, fallbackReplayService } = useAppearance()
const replayChain = computed(() =>
  resolveReplayChain(
    {
      blScoreId: props.score?.blScoreId,
      ssScoreId: props.score?.ssScoreId,
    },
    primaryReplayService.value,
    fallbackReplayService.value,
  ),
)
const coverUrl = computed(() => props.score?.coverUrl ?? '')
const { dominantColor } = useColorExtract(coverUrl)

const resolvedAccent = computed(() => {
  const raw = dominantColor.value
  if (!raw) return 'var(--accent)'
  return themeStore.resolvedBase === 'dark' ? brightenRgb(raw, 60) : raw
})

const historicData = ref<ScoreResponse[]>([])
const selectedMetric = ref<ScoreMetric>('accuracy')
const selectedRange = ref<TimeRange>('30d')

const fetchedPlayer = ref<ScoreDetailPlayer | null>(null)
const resolvedPlayer = computed(() => props.player ?? fetchedPlayer.value)
const playerUser = computed(() => resolvedPlayer.value?.user ?? null)
const playerLevel = computed(() => resolvedPlayer.value?.level ?? null)
const equipped = computed<EquippedItemsResponse>(() => resolvedPlayer.value?.equipped ?? {})
const mapDifficulty = ref<PublicMapDifficultyResponse | null>(null)

let lastFetchedUserId: string | null = null
let lastFetchedDifficultyId: string | null = null

const {
  titleValue: equippedTitle,
  borderShapeValue: equippedBorderShape,
  borderColorValue: equippedBorderColor,
  titleEffects: equippedTitleEffects,
  borderEffects: equippedBorderEffects,
  thumbnailValue: equippedThumbnail,
  thumbnailEffects: equippedThumbnailEffects,
} = useEquippedRenderProps(equipped)

const playerRef = computed<UserRefDisplay>(() => ({
  id: props.userId,
  name: playerUser.value?.name ?? props.score?.userName ?? '',
  country: playerUser.value?.country ?? null,
  supporterTier: playerUser.value?.supporterTier ?? props.score?.supporterTier ?? null,
  clan: playerUser.value?.clan ?? null,
}))
const playerAvatar = computed(() => pickAvatarUrl(playerUser.value))
const complexity = computed(() => props.score?.complexity ?? mapDifficulty.value?.complexity ?? null)
const difficultyRaw = computed(() => props.score?.rawDifficulty ?? mapDifficulty.value?.difficulty ?? null)
const characteristic = computed(() => props.score?.characteristic ?? mapDifficulty.value?.characteristic ?? null)
const songSubName = computed(
  () => props.score?.mapSubName ?? mapDifficulty.value?.songSubName ?? null,
)

const isFc = computed(() => {
  const s = props.score
  return !!s && !s.misses && !s.badCuts && !s.wallHits && !s.bombHits
})

const category = computed(() => {
  const code = props.score?.categoryCode
  if (!code) return null
  return { name: categoryStore.getCategoryInfo(code)?.name ?? code, accent: categoryStore.getAccent(code) }
})

interface Fact {
  label: string
  value: string
  bad?: boolean
}

const facts = computed<Fact[]>(() => {
  const s = props.score
  if (!s) return []
  const count = (label: string, value: number | null | undefined, bad = false): Fact[] =>
    value != null && (!bad || value > 0) ? [{ label, value: value.toLocaleString(), bad }] : []
  return [
    { label: 'Score', value: s.score.toLocaleString() },
    ...(s.scoreNoMods != null && s.scoreNoMods !== s.score ? count('No Mods', s.scoreNoMods) : []),
    ...count('Plays', s.playCount),
    ...count('Pauses', s.pauses),
    ...count('Max Combo', s.maxCombo),
    ...count('Misses', s.misses, true),
    ...count('Bad Cuts', s.badCuts, true),
    ...count('Wall Hits', s.wallHits, true),
    ...count('Bomb Hits', s.bombHits, true),
    ...(s.hmd ? [{ label: 'Headset', value: s.hmd }] : []),
    { label: 'Set', value: formatRelativeDate(s.date) },
  ]
})

const RANGE_UNIT_MS = { h: HOUR_MS, d: DAY_MS, mo: DAY_MS * 30 }

function rangeMs(range: TimeRange): number {
  const { amount, unit } = TIME_RANGE_PARAMS[range]
  return amount * RANGE_UNIT_MS[unit]
}

const xpTotals = computed(() =>
  historicData.value.reduce(
    (t, s) => ({ total: t.total + (s.xpGained ?? 0), base: t.base + (s.baseXp ?? 0), bonus: t.bonus + (s.bonusXp ?? 0) }),
    { total: 0, base: 0, bonus: 0 },
  ),
)

function scoreTypeLabel(s: ScoreResponse): string {
  if (s.active) return 'Current PB'
  switch (s.supersedesReason) {
    case 'Score improved': return 'Previous PB'
    case 'Worse score': return 'Worse attempt'
    case 'Partial attempt': return 'Quit early'
    case 'Complexity reweight': return 'Reweighted'
    case 'XP curve update': return 'XP recomputed'
    case 'User merge': return 'Merged account'
    default: return s.partial ? 'Quit early' : 'Historical'
  }
}

function buildTooltipLines(s: ScoreResponse, prev: ScoreResponse | null): string[] {
  const lines: string[] = []
  lines.push(scoreTypeLabel(s))
  lines.push(`Accuracy: ${formatAccuracy(s.accuracy)}`)
  lines.push(`AP: ${s.ap.toFixed(2)}`)
  lines.push(`XP: ${(s.xpGained ?? 0).toFixed(1)} (${(s.baseXp ?? 0).toFixed(0)} base + ${(s.bonusXp ?? 0).toFixed(1)} bonus)`)
  if (s.streak115 != null) lines.push(`115 Streak: ${s.streak115}`)
  if (s.misses > 0) lines.push(`Misses: ${s.misses}`)
  if (s.rankWhenSet != null) lines.push(`Rank: #${s.rankWhenSet}`)
  if (prev) {
    const accDelta = (s.accuracy - prev.accuracy) * 100
    const apDelta = s.ap - prev.ap
    const parts: string[] = []
    if (accDelta !== 0) parts.push(`${accDelta > 0 ? '+' : ''}${accDelta.toFixed(2)}% acc`)
    if (apDelta !== 0) parts.push(`${apDelta > 0 ? '+' : ''}${apDelta.toFixed(2)} AP`)
    if (parts.length > 0) lines.push(`Δ ${parts.join(', ')}`)
  }
  return lines
}

const METRIC_VALUE: Record<ScoreMetric, (s: ScoreResponse, cumulativeXp: number) => number> = {
  accuracy: (s) => s.accuracy * 100,
  ap: (s) => s.ap,
  xpCumulative: (_, cumulativeXp) => cumulativeXp,
  xpPerAttempt: (s) => s.xpGained ?? 0,
}

const chartPoints = computed<TimeSeriesPoint[]>(() => {
  const sorted = [...historicData.value].sort(
    (a, b) => new Date(a.timeSet).getTime() - new Date(b.timeSet).getTime(),
  )
  const valueOf = METRIC_VALUE[selectedMetric.value]
  const since = Date.now() - rangeMs(selectedRange.value)
  let cumulativeXp = 0
  return sorted
    .map((s, i) => {
      cumulativeXp += s.xpGained ?? 0
      return {
        timestamp: new Date(s.timeSet).getTime(),
        value: valueOf(s, cumulativeXp),
        tooltipLines: buildTooltipLines(s, i > 0 ? sorted[i - 1] : null),
      }
    })
    .filter((point) => point.timestamp >= since)
})

function fittingRange(scores: ScoreResponse[]): TimeRange {
  const oldest = Math.min(...scores.map((s) => new Date(s.timeSet).getTime()))
  const ranges = Object.keys(TIME_RANGE_PARAMS) as TimeRange[]
  return ranges.find((range) => Date.now() - rangeMs(range) <= oldest) ?? 'all'
}

const chartFormatValue = computed(() => {
  if (selectedMetric.value === 'accuracy') return (v: number) => `${v.toFixed(2)}%`
  if (selectedMetric.value === 'xpCumulative' || selectedMetric.value === 'xpPerAttempt') return (v: number) => `${v.toFixed(1)} XP`
  return undefined
})

function navigateAway(to: Parameters<typeof router.push>[0]) {
  emit('close')
  requestAnimationFrame(() => router.push(to))
}

function goToProfile() {
  navigateAway({ name: 'player-profile', params: { userId: props.userId } })
}

function goToMap() {
  if (!props.score?.mapId) return
  navigateAway(buildMapRoute({
    beatsaverCode: props.score.beatsaverCode,
    mapId: props.score.mapId,
    difficulty: props.score.rawDifficulty,
    difficultyId: props.score.mapDifficultyId,
    characteristic: props.score.characteristic,
  }))
}

async function fetchHistoric() {
  if (!props.score) return
  try {
    const { getUserScoresHistoric } = await import('@/api/users')
    const scores = await getUserScoresHistoric(props.userId, {
      mapDifficultyId: props.score.mapDifficultyId,
      ...TIME_RANGE_PARAMS.all,
    })
    historicData.value = scores
    if (scores.length) selectedRange.value = fittingRange(scores)
  } catch {
    historicData.value = []
  }
}

async function fetchPlayer() {
  if (props.player || !props.userId || props.userId === lastFetchedUserId) return
  lastFetchedUserId = props.userId
  fetchedPlayer.value = null
  const [usersApi, itemsApi] = await Promise.all([import('@/api/users'), import('@/api/items')])
  const [user, level, equipped] = await Promise.all([
    usersApi.getUser(props.userId).catch(() => null),
    usersApi.getUserLevel(props.userId).catch(() => null),
    itemsApi.getUserEquippedItems(props.userId).catch(() => ({} as EquippedItemsResponse)),
  ])
  fetchedPlayer.value = { user, level, equipped: equipped ?? {} }
}

async function fetchMapDifficulty() {
  const id = props.score?.mapDifficultyId
  if (!id || props.score?.complexity != null || id === lastFetchedDifficultyId) return
  lastFetchedDifficultyId = id
  try {
    const { getDifficulty } = await import('@/api/maps')
    mapDifficulty.value = await getDifficulty(id)
  } catch {
    mapDifficulty.value = null
  }
}

watch(
  [() => props.open, () => props.score?.mapDifficultyId],
  ([open]) => {
    if (open && props.score) fetchHistoric()
  },
  { immediate: true },
)

watch(
  [() => props.open, () => props.userId, () => props.score?.mapDifficultyId],
  ([open]) => {
    if (!open) return
    fetchPlayer()
    fetchMapDifficulty()
  },
  { immediate: true },
)
</script>

<template>
  <BaseModal :open="open" max-width="980px" close-button @close="emit('close')">
    <div v-if="score" class="score-detail" :style="{ '--detail-accent': resolvedAccent }">
      <header class="score-detail__player">
        <ThumbnailBackdrop class="score-detail__thumb" :value="equippedThumbnail" :effects="equippedThumbnailEffects" />
        <LevelBadge
          v-if="playerAvatar"
          class="score-detail__levelbadge"
          :level="playerLevel?.level ?? 0"
          :current-xp="playerLevel?.xpForCurrentLevel ?? 0"
          :required-xp="playerLevel?.xpForNextLevel ?? 1"
          :avatar-url="playerAvatar"
          :fallback-title="playerLevel?.title"
          hide-progress
          :equipped-title="equippedTitle"
          :equipped-border-shape="equippedBorderShape"
          :equipped-border-color="equippedBorderColor"
          :title-effects="equippedTitleEffects"
          :border-effects="equippedBorderEffects"
        />
        <div v-else class="score-detail__player-skeleton" />
        <UserChip :user="playerRef" size="lg" hide-avatar name-tag="h2" class="score-detail__player-name" />
      </header>

      <div class="score-detail__main">
        <CoverImage v-if="score.coverUrl" :src="score.coverUrl" :alt="score.mapName" :size="112"
          :fallback-src="score.coverFallbackUrl ?? null" />
        <div class="score-detail__map">
          <h3 class="section-title score-detail__song">
            <SongTitle :name="score.mapName" :sub-name="songSubName" />
          </h3>
          <p class="caption">
            {{ score.artistName }}<template v-if="score.artistName && score.mapAuthor"> · </template>
            <template v-if="score.mapAuthor">mapped by {{ score.mapAuthor }}</template>
          </p>
          <div class="score-detail__tags">
            <span v-if="category" class="score-detail__tag" :style="{ color: category.accent }">{{ category.name }}</span>
            <DifficultyBadge v-if="difficultyRaw" :difficulty="difficultyRaw" />
            <ComplexityBadge v-if="complexity != null" :complexity="complexity" />
            <span v-if="characteristic && characteristic !== 'Standard'" class="score-detail__tag">{{ characteristic }}</span>
            <span v-if="isFc" class="score-detail__tag score-detail__tag--good">Full combo</span>
            <span v-if="score.streak115" class="score-detail__tag">{{ score.streak115 }}x115</span>
            <span v-for="mod in score.modifiers" :key="mod" class="score-detail__tag">{{ mod }}</span>
          </div>
        </div>
        <div class="score-detail__figures">
          <StatBlock label="Rank" :value="`#${score.leaderboardRank}`">
            <span v-if="score.rankWhenSet != null && score.rankWhenSet !== score.leaderboardRank" class="caption">
              set as #{{ score.rankWhenSet }}
            </span>
          </StatBlock>
          <StatBlock label="Accuracy" :value="formatAccuracy(score.accuracy)" />
          <StatBlock label="AP" :value="score.ap" class="score-detail__ap"
            :style="category ? { '--figure': category.accent } : undefined">
            <span v-if="score.weightedAp !== score.ap" class="caption">weighted {{ score.weightedAp.toFixed(2) }}</span>
          </StatBlock>
        </div>
      </div>

      <div class="score-detail__facts">
        <StatBlock v-for="fact in facts" :key="fact.label" :label="fact.label" :value="fact.value"
          :class="{ 'score-detail__bad': fact.bad }" />
        <StatBlock v-if="xpTotals.total > 0" label="XP" :value="xpTotals.total.toFixed(1)">
          <template #label-suffix>
            <HintTooltip label="XP"
              :text="`Base ${xpTotals.base.toFixed(1)}, bonus ${xpTotals.bonus.toFixed(1)}`" />
          </template>
        </StatBlock>
      </div>

      <div class="score-detail__links">
        <div class="score-detail__link-group">
          <BaseButton @click="goToProfile">Profile</BaseButton>
          <BaseButton v-if="score.mapId" @click="goToMap">Map</BaseButton>
        </div>
        <div class="score-detail__link-group">
          <BaseButton v-for="replay in replayChain" :key="replay.provider" :href="replay.url">
            <img :src="replay.icon" alt="" width="20" height="20" class="score-detail__replay-icon"
              loading="lazy" decoding="async" />
            {{ replay.name }}
          </BaseButton>
          <BaseButton v-if="score.blScoreId" :href="`https://beatleader.com/score/${score.blScoreId}`">
            Score Page
          </BaseButton>
        </div>
      </div>

      <section class="score-detail__history">
        <h3 class="card-title">History</h3>
        <TimeSeriesChart v-if="historicData.length > 1" :data="chartPoints" :metric-label="selectedMetric"
          :accent-color="resolvedAccent" :available-metrics="SCORE_DETAIL_METRICS"
          :selected-metric="selectedMetric as MetricType" :selected-range="selectedRange"
          :format-value="chartFormatValue" ordinal :y-max="selectedMetric === 'accuracy' ? 100 : undefined"
          @update:selected-metric="selectedMetric = $event as ScoreMetric"
          @update:selected-range="selectedRange = $event" />
        <p v-else class="caption">One attempt on this map</p>
      </section>
    </div>
  </BaseModal>
</template>

<style scoped>
.score-detail {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  position: relative;
  --accent: var(--detail-accent);
}

.score-detail__player {
  --badge: 64px;
  position: relative;
  display: grid;
  grid-template-columns: var(--badge) minmax(0, 1fr);
  grid-template-rows: repeat(2, calc(var(--badge) / 2));
  column-gap: var(--space-md);
  z-index: 1;
}

.score-detail__thumb {
  inset: calc(-1 * var(--space-lg)) auto calc(-1 * var(--space-md)) calc(-1 * var(--space-lg));
  width: min(70%, 640px);
  border-radius: 0;
  mask-image:
    linear-gradient(to right, rgb(0 0 0 / 0.5), rgb(0 0 0 / 0.2) 50%, transparent),
    linear-gradient(to bottom, black 60%, transparent);
  mask-composite: intersect;
}

.score-detail__levelbadge {
  display: contents;
}

.score-detail__levelbadge :deep(.level-badge__stack),
.score-detail__player-skeleton {
  grid-area: 1 / 1 / span 2;
  width: var(--badge);
  height: var(--badge);
}

.score-detail__player-skeleton {
  border-radius: var(--radius-avatar);
  background: var(--bg-elevated);
}

.score-detail__levelbadge :deep(.level-badge__below) {
  grid-area: 2 / 2;
  align-items: flex-start;
  align-self: start;
  width: auto;
}

.score-detail__player-name {
  grid-area: 1 / 2;
  align-self: end;
}

.score-detail__main {
  display: flex;
  align-items: center;
  gap: var(--space-lg);
  position: relative;
  z-index: 1;
}

.score-detail__map {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  flex: 1;
  min-width: 0;
}

.score-detail__song {
  overflow-wrap: anywhere;
}

.score-detail__tags {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-xs) var(--space-md);
  margin-top: var(--space-xs);
}

.score-detail__tag {
  font-size: var(--text-caption);
  font-weight: 600;
  color: var(--text-secondary);
}

.score-detail__tag--good {
  color: var(--success);
}

.score-detail__figures {
  display: grid;
  grid-template-columns: repeat(3, auto);
  gap: var(--space-xl);
  flex-shrink: 0;
}

.score-detail :deep(.stat-block) {
  padding: 0;
}

.score-detail__figures :deep(.stat-block__value) {
  font-size: 2rem;
  line-height: 1.2;
}

.score-detail__ap :deep(.stat-block__value) {
  color: var(--figure, var(--text-primary));
}

.score-detail__facts {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-md) var(--space-xl);
}

.score-detail__facts :deep(.stat-block__value) {
  font-size: var(--text-body);
}

.score-detail__bad :deep(.stat-block__value) {
  color: var(--error);
}

.score-detail__links,
.score-detail__link-group {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
}

.score-detail__links {
  justify-content: space-between;
}

.score-detail__replay-icon {
  border-radius: var(--radius-xs);
}

.score-detail__history {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.score-detail__history :deep(.chart-canvas-wrapper) {
  height: 170px;
}

.score-detail__history :deep(.chart-skeleton) {
  height: 170px !important;
}

@media (max-width: 768px) {
  .score-detail__main {
    flex-direction: column;
    align-items: flex-start;
  }

  .score-detail__figures {
    gap: var(--space-lg);
  }
}
</style>
