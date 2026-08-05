<script setup lang="ts">
import { buildSnipePlaylistUrl, getClosestScores } from '@/api/snipe'
import BaseButton from '@/components/common/BaseButton.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import StatBlock from '@/components/common/StatBlock.vue'
import SnipeComparisonRow from '@/components/domain/SnipeComparisonRow.vue'
import UserPicker from '@/components/domain/UserPicker.vue'
import { useAuthStore } from '@/stores/auth'
import { useCategoryStore } from '@/stores/categories'
import { useModifierStore } from '@/stores/modifiers'
import type { SnipeComparisonResponse } from '@/types/api/snipe'
import type { ScoreResponse } from '@/types/api/users'
import type { ScoreDisplay } from '@/types/display'
import { toScoreDisplay } from '@/utils/mappers'
import { computed, defineAsyncComponent, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    sniperId: string
    sniperName: string
    targetId: string
    targetName: string
    rows?: number
  }>(),
  { rows: 3 },
)

const ScoreDetailModal = defineAsyncComponent(
  () => import('@/components/domain/ScoreDetailModal.vue'),
)

const authStore = useAuthStore()
const categoryStore = useCategoryStore()
const modifierStore = useModifierStore()

const pickedId = ref<string | null>(null)
const pickedName = ref<string | null>(null)

const activeTargetId = computed(() => pickedId.value ?? props.targetId)
const activeTargetName = computed(() => pickedName.value ?? props.targetName)

const comparisons = ref<SnipeComparisonResponse[]>([])
const loading = ref(true)
const failed = ref(false)

const samePlayer = computed(() => props.sniperId === activeTargetId.value)

const detailOpen = ref(false)
const detailScore = ref<ScoreDisplay | null>(null)
const detailUserId = ref('')

let loadSeq = 0

async function load() {
  if (samePlayer.value) {
    comparisons.value = []
    loading.value = false
    return
  }
  const seq = ++loadSeq
  loading.value = true
  failed.value = false
  try {
    const page = await getClosestScores(props.sniperId, activeTargetId.value, {
      page: 0,
      size: props.rows,
    })
    if (seq !== loadSeq) return
    comparisons.value = page.content
  } catch {
    if (seq !== loadSeq) return
    comparisons.value = []
    failed.value = true
  } finally {
    if (seq === loadSeq) loading.value = false
  }
}

function onPick(user: { userId: string; userName: string } | null) {
  pickedId.value = user?.userId ?? null
  pickedName.value = user?.userName ?? null
}

function openDetail(score: ScoreResponse) {
  detailScore.value = toScoreDisplay(
    score,
    modifierStore.resolveModifierCodes(score.modifierIds),
    categoryStore.getCategoryCode(score.categoryId),
  )
  detailUserId.value = score.userId
  detailOpen.value = true
}

const closestGap = computed(() => {
  const first = comparisons.value[0]
  if (!first) return 0
  return (first.targetScore.accuracy - first.sniperScore.accuracy) * 100
})

const pointsToGain = computed(() =>
  comparisons.value.reduce((sum, c) => sum + c.scoreDelta, 0),
)

const apAtStake = computed(() =>
  comparisons.value.reduce((sum, c) => sum + (c.targetScore.ap - c.sniperScore.ap), 0),
)

const playlistUrl = computed(() =>
  buildSnipePlaylistUrl(props.sniperId, activeTargetId.value, { size: props.rows }),
)

const viewerIsSniper = computed(
  () => authStore.isLoggedIn && authStore.userId === props.sniperId,
)

const liveRoute = computed(() =>
  viewerIsSniper.value
    ? `/players/${activeTargetId.value}/snipe`
    : `/players/${activeTargetId.value}`,
)

const liveLabel = computed(() =>
  viewerIsSniper.value
    ? `Open the full page against ${activeTargetName.value}`
    : `Find this on ${activeTargetName.value}'s profile`,
)

watch([() => props.sniperId, activeTargetId], load, { immediate: true })
</script>

<template>
  <figure class="board" data-wiki-raw>
    <div class="board__head">
      <div class="board__pair">
        <span class="board__label">Sniping</span>
        <span class="board__names">
          <strong>{{ sniperName }}</strong> against <strong>{{ activeTargetName }}</strong>
        </span>
      </div>
      <UserPicker
        class="board__picker"
        :model-value="pickedId"
        placeholder="Pick a different target..."
        @select="onPick"
      />
    </div>

    <template v-if="loading">
      <SkeletonLoader v-for="i in rows" :key="i" variant="card" height="140px" />
    </template>

    <EmptyState
      v-else-if="samePlayer"
      message="Pick somebody other than yourself, since you cannot snipe your own scores."
    />

    <EmptyState
      v-else-if="failed"
      message="Could not load this matchup right now. The real thing lives on any player's profile."
    />

    <EmptyState
      v-else-if="comparisons.length === 0"
      :message="`Nothing to take. You are already ahead of ${activeTargetName} on every map you have both played.`"
    />

    <template v-else>
      <div class="board__stats">
        <StatBlock label="Closest Gap" :value="`+${closestGap.toFixed(2)}%`" />
        <StatBlock label="Points to Gain" :value="pointsToGain" :decimals="0" />
        <StatBlock label="AP at Stake" :value="apAtStake" :decimals="2" />
      </div>

      <div class="board__rows">
        <SnipeComparisonRow
          v-for="comparison in comparisons"
          :key="comparison.mapDifficulty.id"
          :comparison="comparison"
          :sniper-name="sniperName"
          :target-name="activeTargetName"
          @open-detail="openDetail"
        />
      </div>

      <div class="board__actions">
        <BaseButton variant="primary" :href="playlistUrl" aria-label="Download Beat Saber playlist">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M12 3v12" />
            <path d="m7 10 5 5 5-5" />
            <path d="M5 21h14" />
          </svg>
          <span>Download these {{ comparisons.length }} as a playlist</span>
        </BaseButton>
        <RouterLink class="board__live" :to="liveRoute">{{ liveLabel }}</RouterLink>
      </div>
    </template>

    <ScoreDetailModal
      v-if="detailOpen"
      :open="detailOpen"
      :score="detailScore"
      :user-id="detailUserId"
      @close="detailOpen = false"
    />
  </figure>
</template>

<style scoped>
.board {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  margin: 0 0 var(--space-md);
  padding: var(--space-md);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  background: var(--bg-surface);
}

.board__head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-lg);
  flex-wrap: wrap;
}

.board__pair {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 200px;
}

.board__label {
  font-size: var(--text-caption);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary);
}

.board__names {
  font-size: var(--text-body);
  color: var(--text-secondary);
}

.board__names strong {
  color: var(--text-primary);
  font-weight: 600;
}

.board__picker {
  flex: 1;
  max-width: 320px;
}

.board__stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: var(--space-md);
}

.board__rows {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.board__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
  flex-wrap: wrap;
}

.board__live {
  color: var(--accent);
  font-size: var(--text-caption);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.board__live:hover {
  filter: brightness(1.15);
}

@media (max-width: 560px) {
  .board__picker {
    max-width: none;
  }
}
</style>
