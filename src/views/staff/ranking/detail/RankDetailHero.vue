<script setup lang="ts">
import BaseTabs from '@/components/common/BaseTabs.vue'
import DeactivationNote from '@/components/domain/DeactivationNote.vue'
import DifficultyBadge from '@/components/domain/DifficultyBadge.vue'
import FollowButton from '@/components/domain/FollowButton.vue'
import HeroFact from '@/components/domain/HeroFact.vue'
import MapHero from '@/components/domain/MapHero.vue'
import RankingFacts from '@/components/domain/RankingFacts.vue'
import { useMapFollow } from '@/composables/useMapFollow'
import { useAuthStore } from '@/stores/auth'
import { useCategoryStore } from '@/stores/categories'
import type { MapDifficultyResponse, VoteListResponse } from '@/types/api/maps'
import { scriptNote } from '@/utils/complexity'
import { pickCoverFallback } from '@/utils/media'
import RankDetailCategory from '@/views/staff/ranking/detail/RankDetailCategory.vue'
import RankDetailComplexity from '@/views/staff/ranking/detail/RankDetailComplexity.vue'
import { computed, watch } from 'vue'

const props = defineProps<{
  difficulty: MapDifficultyResponse | null
  voteData: VoteListResponse | null
  coverUrl: string
  categoryCode: string
  isHeadRanking: boolean
  isRanking: boolean
  outdated: boolean
  subscribed: boolean
}>()

const emit = defineEmits<{
  updated: [difficulty: MapDifficultyResponse, reweighting: boolean]
}>()

const authStore = useAuthStore()
const categoryStore = useCategoryStore()

const follow = useMapFollow(computed(() => props.difficulty?.id))

watch(
  () => [props.difficulty?.id, props.subscribed] as const,
  ([, subscribed]) => follow.set(subscribed),
  { immediate: true },
)

async function saveReason(reason: string) {
  const target = props.difficulty
  if (!target) return
  const { deactivateMapDifficulty } = await import('@/api/ranking/maps')
  await deactivateMapDifficulty(target.id, reason)
  emit('updated', { ...target, deactivationReason: reason }, false)
}

const scoreCurveId = computed(() => categoryStore.byCode.get(props.categoryCode)?.scoreCurve?.id ?? null)

const script = computed(() => props.difficulty && scriptNote(props.difficulty))

async function runCheck() {
  const { runAutoCriteriaCheck } = await import('@/api/ranking/maps')
  return runAutoCriteriaCheck(props.difficulty!.id)
}
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
      <DeactivationNote v-if="difficulty.deactivatedAt" :at="difficulty.deactivatedAt" :reason="difficulty.deactivationReason"
        :save="isHeadRanking ? saveReason : undefined" />
      <Transition name="collapse">
        <div v-if="outdated" class="collapsible hero-outdated" role="status">
          <p>BeatSaver has a newer version of this map</p>
        </div>
      </Transition>
    </template>

    <template v-if="difficulty && authStore.userId" #actions>
      <FollowButton :following="follow.following.value" :busy="follow.busy.value" @toggle="follow.toggle" />
    </template>

    <template v-if="follow.error.value" #side>
      <span class="caption hero-error" role="alert">{{ follow.error.value }}</span>
    </template>

    <template v-if="difficulty" #facts>
      <RankingFacts :difficulty="difficulty" :vote-data="voteData" :run="isRanking ? runCheck : undefined" >
        <HeroFact v-if="script" label="Script" :title="difficulty.scriptVersion ?? undefined">{{ script }}</HeroFact>
        <template v-if="difficulty.status === 'RANKED' && voteData" #end>
          <HeroFact label="Reweight">{{ voteData.reweightReady ? 'Ready' : 'Not Ready' }}</HeroFact>
        </template>
      </RankingFacts>
    </template>
  </MapHero>
</template>

<style scoped>
.hero-error {
  color: var(--error);
}

.hero-outdated {
  flex-basis: 100%;
  font-size: var(--text-body);
  color: var(--warning);
}

.hero-outdated > p {
  margin: 0;
}
</style>
