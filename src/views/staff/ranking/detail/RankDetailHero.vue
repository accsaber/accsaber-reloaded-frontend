<script setup lang="ts">
import BaseTabs from '@/components/common/BaseTabs.vue'
import CriteriaVerdict from '@/components/domain/CriteriaVerdict.vue'
import DifficultyBadge from '@/components/domain/DifficultyBadge.vue'
import MapHero from '@/components/domain/MapHero.vue'
import { useCategoryStore } from '@/stores/categories'
import type { MapDifficultyResponse, VoteListResponse } from '@/types/api/maps'
import type { MapDifficultyStatus } from '@/types/enums'
import { scriptNote } from '@/utils/complexity'
import { pickCoverFallback } from '@/utils/media'
import RankDetailCategory from '@/views/staff/ranking/detail/RankDetailCategory.vue'
import RankDetailComplexity from '@/views/staff/ranking/detail/RankDetailComplexity.vue'
import RankDetailAutoCheck from '@/views/staff/ranking/detail/RankDetailAutoCheck.vue'
import { computed } from 'vue'

const props = defineProps<{
  difficulty: MapDifficultyResponse | null
  voteData: VoteListResponse | null
  coverUrl: string
  categoryCode: string
  isHeadRanking: boolean
  isRanking: boolean
}>()

const emit = defineEmits<{
  updated: [difficulty: MapDifficultyResponse, reweighting: boolean]
}>()

const STATUS_LABEL: Record<MapDifficultyStatus, string> = {
  QUEUE: 'In Queue',
  QUALIFIED: 'Qualified',
  RANKED: 'Ranked',
  CAMPAIGN: 'Campaign',
}

const categoryStore = useCategoryStore()

const scoreCurveId = computed(() => categoryStore.byCode.get(props.categoryCode)?.scoreCurve?.id ?? null)

const criteriaSource = computed(() => {
  const d = props.difficulty
  return d && {
    criteriaStatus: d.criteriaStatus,
    autoCriteriaStatus: null,
    criteriaUpvotes: props.voteData?.criteriaUpvotes ?? d.criteriaUpvotes,
    criteriaDownvotes: props.voteData?.criteriaDownvotes ?? d.criteriaDownvotes,
    headCriteriaVote: props.voteData?.headCriteriaVote ?? d.headCriteriaVote,
  }
})

const script = computed(() => props.difficulty && scriptNote(props.difficulty))
</script>

<template>
  <MapHero
    :song="difficulty"
    :cover-url="coverUrl"
    :cover-fallback="pickCoverFallback(difficulty)"
    :bl-leaderboard-id="difficulty?.blLeaderboardId"
    :ss-leaderboard-id="difficulty?.ssLeaderboardId"
    :curve-id="scoreCurveId"
    :tweaker-complexity="difficulty?.complexity"
    :chart="difficulty"
  >
    <template v-if="difficulty" #meta>
      <BaseTabs variant="segmented" label="Difficulty" :tabs="[{ key: difficulty.id, label: difficulty.difficulty }]"
        :model-value="difficulty.id">
        <template #tab="{ tab }">
          <DifficultyBadge :difficulty="tab.label" />
        </template>
      </BaseTabs>
      <RankDetailComplexity :difficulty="difficulty" :editable="isHeadRanking"
        @updated="(d, reweighting) => emit('updated', d, reweighting)" />
      <RankDetailCategory :difficulty="difficulty" :category-code="categoryCode" :editable="isHeadRanking"
        @updated="emit('updated', $event, false)" />
    </template>

    <template v-if="difficulty" #side>
      <div class="hero-facts">
        <div v-if="script" class="hero-facts__fact">
          <span class="field-label">Script</span>
          <span class="hero-facts__value" :title="difficulty.scriptVersion ?? undefined">{{ script }}</span>
        </div>
        <div class="hero-facts__fact">
          <span class="field-label">Status</span>
          <span class="hero-facts__value">{{ STATUS_LABEL[difficulty.status] }}</span>
        </div>
        <template v-if="difficulty.status !== 'RANKED'">
          <div class="hero-facts__fact">
            <span class="field-label">Criteria</span>
            <span class="hero-facts__value"><CriteriaVerdict v-if="criteriaSource" :source="criteriaSource" /></span>
          </div>
          <RankDetailAutoCheck :difficulty="difficulty" :can-run="isRanking" />
        </template>
        <div v-else-if="voteData" class="hero-facts__fact">
          <span class="field-label">Reweight</span>
          <span class="hero-facts__value">{{ voteData.reweightReady ? 'Ready' : 'Not Ready' }}</span>
        </div>
      </div>
    </template>
  </MapHero>
</template>

<style scoped>
.hero-facts {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--space-sm) var(--space-xl);
  text-align: left;
}

.hero-facts__fact {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.hero-facts__value {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  font-weight: 600;
  color: var(--text-primary);
}
</style>
