<script setup lang="ts">
import PinnedScoreCard from '@/views/profile/PinnedScoreCard.vue'
import StoredFold from '@/components/common/StoredFold.vue'
import ScoreDetailModal, { type ScoreDetailPlayer } from '@/components/domain/ScoreDetailModal.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import SwapList from '@/components/common/SwapList.vue'
import { useCategoryStore } from '@/stores/categories'
import { useModifierStore } from '@/stores/modifiers'
import type { PinnedScoreResponse, ScoreResponse } from '@/types/api/users'
import type { ScoreDisplay } from '@/types/display'
import { toScoreDisplay } from '@/utils/mappers'
import { ref } from 'vue'

defineProps<{
  pinned: PinnedScoreResponse[]
  loading: boolean
  isSelfProfile: boolean
  maxSlots: number
  player?: ScoreDetailPlayer | null
}>()

const emit = defineEmits<{
  unpin: [scoreId: string]
  'update-comment': [payload: { scoreId: string, comment: string | null }]
}>()

const categoryStore = useCategoryStore()
const modifierStore = useModifierStore()

const detailOpen = ref(false)
const detailScore = ref<ScoreDisplay | null>(null)
const detailUserId = ref('')

function onOpenDetail(score: ScoreResponse) {
  detailScore.value = toScoreDisplay(
    score,
    modifierStore.resolveModifierCodes(score.modifierIds),
    categoryStore.getCategoryCode(score.categoryId),
  )
  detailUserId.value = score.userId
  detailOpen.value = true
}
</script>

<template>
  <StoredFold v-if="loading || pinned.length" label="Pinned" storage-key="pinned-scores"
    aria-label="Pinned scores">
    <template #meta>
      <span v-if="isSelfProfile && !loading" class="caption">{{ pinned.length }} of {{ maxSlots }}</span>
    </template>
    <SwapList class="pinned__grid" :items="pinned" :item-key="(pin) => pin.score.id" :loading="loading">
      <template #placeholder>
        <SkeletonLoader class="placeholder" variant="text" height="124px" />
      </template>
      <template #default="{ item: pin, swap }">
        <PinnedScoreCard v-bind="swap" :score="pin.score" :comment="pin.comment" :editable="isSelfProfile"
          @unpin="emit('unpin', $event)" @open-detail="onOpenDetail"
          @save-comment="emit('update-comment', $event)" />
      </template>
    </SwapList>

    <ScoreDetailModal :open="detailOpen" :score="detailScore" :user-id="detailUserId" :player="player"
      @close="detailOpen = false" />
  </StoredFold>
</template>

<style scoped>
.pinned__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr));
  gap: var(--space-md);
}
</style>
