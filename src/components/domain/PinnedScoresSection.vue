<script setup lang="ts">
import PinnedScoreCard from '@/components/domain/PinnedScoreCard.vue'
import ScoreDetailModal from '@/components/domain/ScoreDetailModal.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import { useCategoryStore } from '@/stores/categories'
import { useModifierStore } from '@/stores/modifiers'
import type { PinnedScoreResponse, ScoreResponse } from '@/types/api/users'
import type { ScoreDisplay } from '@/types/display'
import { toScoreDisplay } from '@/utils/mappers'
import { ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    userId: string
    pinned: PinnedScoreResponse[]
    loading: boolean
    isSelfProfile: boolean
    maxSlots?: number
  }>(),
  { maxSlots: 3 },
)

const STANDARD_SLOTS = 3

const emit = defineEmits<{
  unpin: [scoreId: string]
  'update-comment': [payload: { scoreId: string, comment: string | null }]
}>()

const categoryStore = useCategoryStore()
const modifierStore = useModifierStore()

const detailOpen = ref(false)
const detailScore = ref<ScoreDisplay | null>(null)
const detailUserId = ref('')

const complexities = ref<Map<string, number | null>>(new Map())

watch(() => props.pinned, async (next) => {
  const missing = next
    .map((p) => p.score.mapDifficultyId)
    .filter((id) => !complexities.value.has(id))
  if (missing.length === 0) return
  const { getDifficulty } = await import('@/api/maps')
  const results = await Promise.allSettled(missing.map((id) => getDifficulty(id)))
  const updated = new Map(complexities.value)
  results.forEach((res, i) => {
    const id = missing[i]
    updated.set(id, res.status === 'fulfilled' ? res.value.complexity : null)
  })
  complexities.value = updated
}, { immediate: true, deep: true })

function onOpenDetail(score: ScoreResponse) {
  detailScore.value = toScoreDisplay(
    score,
    modifierStore.resolveModifierCodes(score.modifierIds),
    categoryStore.getCategoryCode(score.categoryId),
  )
  detailUserId.value = score.userId
  detailOpen.value = true
}

function onUnpin(scoreId: string) {
  emit('unpin', scoreId)
}

function onCommentSave(payload: { scoreId: string, comment: string | null }) {
  emit('update-comment', payload)
}
</script>

<template>
  <section v-if="loading || pinned.length > 0" class="pinned" aria-label="Pinned scores">
    <header class="pinned__header">
      <h2 class="pinned__label">Pinned</h2>
      <span v-if="!loading && pinned.length > 0" class="pinned__count">
        {{ pinned.length }} of {{ maxSlots }}
        <span
          v-if="maxSlots > STANDARD_SLOTS && isSelfProfile"
          class="pinned__perk"
          title="Supporters get extra pinned slots"
        >Supporter perk</span>
      </span>
    </header>

    <div v-if="loading" class="pinned__grid">
      <SkeletonLoader v-for="i in Math.min(maxSlots, 3)" :key="i" variant="card" />
    </div>
    <div v-else class="pinned__grid">
      <PinnedScoreCard v-for="pin in pinned" :key="pin.score.id" :score="pin.score" :comment="pin.comment"
        :editable="isSelfProfile" :can-unpin="isSelfProfile"
        :complexity="complexities.get(pin.score.mapDifficultyId) ?? null"
        @unpin="onUnpin" @open-detail="onOpenDetail" @save-comment="onCommentSave" />
    </div>

    <ScoreDetailModal :open="detailOpen" :score="detailScore" :user-id="detailUserId" @close="detailOpen = false" />
  </section>
</template>

<style scoped>
.pinned {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.pinned__header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-md);
}

.pinned__label {
  margin: 0;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-tertiary);
}

.pinned__count {
  display: inline-flex;
  align-items: baseline;
  gap: var(--space-sm);
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--text-tertiary);
}

.pinned__perk {
  font-family: var(--font-sans);
  font-size: 0.625rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-secondary);
}

.pinned__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--space-md);
}

@media (max-width: 599px) {
  .pinned__grid {
    grid-template-columns: 1fr;
  }
}
</style>
