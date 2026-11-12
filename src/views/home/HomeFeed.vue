<script setup lang="ts">
import { getRelationScores } from '@/api/relations'
import PaginationControls from '@/components/common/PaginationControls.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import SwapList from '@/components/common/SwapList.vue'
import ScoreDetailModal from '@/components/domain/ScoreDetailModal.vue'
import ScoreFeedCard from '@/components/domain/ScoreFeedCard.vue'
import { useNow } from '@/composables/useNow'
import { useCategoryStore } from '@/stores/categories'
import { useModifierStore } from '@/stores/modifiers'
import type { ScoreRelationType } from '@/types/api/relations'
import type { ScoreResponse } from '@/types/api/users'
import type { CategoryCode, ScoreDisplay, ScoreFeedEntry } from '@/types/display'
import type { Page } from '@/types/pagination'
import { feedEntryToScoreDisplay, toScoreFeedEntry } from '@/utils/mappers'
import { computed, ref, watch } from 'vue'

const SIZE = 6

const props = defineProps<{
  relation: ScoreRelationType
  category: CategoryCode
}>()

const categoryStore = useCategoryStore()
const modifierStore = useModifierStore()
const now = useNow()

const loading = ref(true)
const pageData = ref<Page<ScoreResponse> | null>(null)
const page = ref(1)
const entries = computed<ScoreFeedEntry[]>(
  () => pageData.value?.content.map((score) => toScoreFeedEntry(
    score,
    modifierStore.resolveModifierCodes(score.modifierIds),
    categoryStore.getCategoryCode(score.categoryId),
  )) ?? [],
)

const modalOpen = ref(false)
const modalScore = ref<ScoreDisplay | null>(null)
const modalUserId = ref('')

function onSelectScore(entry: ScoreFeedEntry) {
  modalScore.value = feedEntryToScoreDisplay(entry)
  modalUserId.value = entry.userId
  modalOpen.value = true
}

let request = 0

async function fetchScores() {
  const current = ++request
  loading.value = true
  try {
    const next = await getRelationScores({
      type: props.relation,
      includePrincipal: true,
      categoryId: props.category === 'overall' ? undefined : categoryStore.getCategoryId(props.category),
      page: page.value - 1,
      size: SIZE,
      sort: 'timeSet,desc',
    })
    if (current === request) pageData.value = next
  } catch {
    if (current === request) pageData.value = null
  } finally {
    if (current === request) loading.value = false
  }
}

watch(() => [props.relation, props.category], () => {
  if (page.value === 1) void fetchScores()
  else page.value = 1
})
watch(page, fetchScores, { immediate: true })
</script>

<template>
  <section class="home-feed">
    <div class="home-feed__header">
      <h2 class="section-title">Latest scores</h2>
    </div>

    <p v-if="pageData && entries.length === 0" class="home-feed__list home-feed__empty">No scores yet</p>

    <SwapList v-else class="home-feed__list" :items="entries" :item-key="(entry) => entry.key"
      :loading="loading && !pageData" :refreshing="loading && !!pageData" :placeholders="SIZE">
      <template #placeholder>
        <SkeletonLoader class="placeholder" width="100%" height="100%" />
      </template>
      <template #default="{ item, swap }">
        <ScoreFeedCard :entry="item" :now="now" v-bind="swap" compact @select="onSelectScore" />
      </template>
    </SwapList>

    <PaginationControls
      v-if="(pageData?.totalPages ?? 0) > 1"
      :page="page"
      :total-pages="pageData!.totalPages"
      :sibling-count="2"
      @update:page="page = $event"
    />

    <ScoreDetailModal :open="modalOpen" :score="modalScore" :user-id="modalUserId" @close="modalOpen = false" />
  </section>
</template>

<style scoped>
.home-feed {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  min-width: 0;
}

.home-feed__header {
  display: flex;
  align-items: center;
  min-height: 32px;
}

.home-feed__list {
  display: grid;
  grid-auto-rows: 64px;
  align-content: start;
  gap: var(--space-xs);
  min-height: calc(64px * 6 + var(--space-xs) * 5);
  margin: 0;
}

.home-feed__empty {
  place-content: center;
  color: var(--text-secondary);
}

@media (max-width: 767px) {
  .home-feed__list {
    grid-auto-rows: auto;
    min-height: 0;
  }
}
</style>
