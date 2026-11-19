<script setup lang="ts">
import CoverImage from '@/components/common/CoverImage.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import PaginationControls from '@/components/common/PaginationControls.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import SwapList from '@/components/common/SwapList.vue'
import DifficultyBadge from '@/components/domain/DifficultyBadge.vue'
import MapNameCell from '@/components/domain/MapNameCell.vue'
import { usePageMeta } from '@/composables/usePageMeta'
import { usePageableRoute } from '@/composables/usePageableRoute'
import type { VoteResponse } from '@/types/api/maps'
import { formatRelativeDate } from '@/utils/formatters'
import { buildRankingMapRoute } from '@/utils/mapRoute'
import { knownCount, rememberCount } from '@/utils/knownCount'
import VoteBody from '@/components/domain/VoteBody.vue'
import { computed, ref, watch } from 'vue'

const PAGE_SIZE = 20
const PAGES_KEY = 'ranking-activity:pages'

usePageMeta({
  title: 'Vote Activity | AccSaber Ranking',
  description: 'Recent voting activity across the ranking queue.',
})

const { currentPage, setPage } = usePageableRoute({
  defaultSort: 'updatedAt',
  defaultOrder: 'desc',
  defaultSize: PAGE_SIZE,
  secondarySort: null,
})

const votes = ref<VoteResponse[]>([])
const totalPages = ref(knownCount(PAGES_KEY, 1))
const loading = ref(true)
const loaded = ref(false)

const countKey = computed(() => `ranking-activity:${currentPage.value}`)

let requestId = 0

async function fetchActivity() {
  const id = ++requestId
  loading.value = true
  try {
    const { getVoteActivity } = await import('@/api/ranking/voting')
    const res = await getVoteActivity({ page: currentPage.value - 1, size: PAGE_SIZE, sort: 'updatedAt,desc' })
    rememberCount(countKey.value, res.content.length)
    rememberCount(PAGES_KEY, res.totalPages)
    if (id !== requestId) return
    votes.value = res.content
    totalPages.value = res.totalPages
  } catch {
    if (id !== requestId) return
    votes.value = []
    totalPages.value = 0
  } finally {
    if (id === requestId) {
      loading.value = false
      loaded.value = true
    }
  }
}

watch(currentPage, fetchActivity, { immediate: true })
</script>

<template>
  <div class="activity">
    <h1>Vote Activity</h1>

    <EmptyState v-if="loaded && !loading && !votes.length" message="No recent activity" />
    <SwapList
      v-else
      as="ul"
      class="activity__list"
      :items="votes"
      :item-key="(vote) => vote.id"
      :loading="!loaded"
      :refreshing="loaded && loading"
      :placeholders="knownCount(countKey, PAGE_SIZE)"
    >
      <template #placeholder>
        <li class="placeholder activity__ghost"><SkeletonLoader height="100%" /></li>
      </template>
      <template #default="{ item: vote, swap }">
        <li v-bind="swap">
          <RouterLink class="activity__row" :to="buildRankingMapRoute(vote.map)">
            <CoverImage :source="vote.map" :size="56" />
            <MapNameCell :name="vote.map.songName" :sub-name="vote.map.songSubName" :artist="vote.map.songAuthor ?? ''"
              :mapper="vote.map.mapAuthor ?? ''">
              <DifficultyBadge :difficulty="vote.map.difficulty" />
            </MapNameCell>
            <VoteBody :vote="vote" clamp />
            <span class="caption activity__date">{{ formatRelativeDate(vote.updatedAt) }}</span>
          </RouterLink>
        </li>
      </template>
    </SwapList>

    <PaginationControls v-if="totalPages > 1" :page="currentPage" :total-pages="totalPages" @update:page="setPage" />
  </div>
</template>

<style scoped>
.activity {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
}

.activity__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  margin: 0;
  padding: 0;
  list-style: none;
}

.activity__row {
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr) minmax(0, 1.4fr) 80px;
  align-items: center;
  gap: var(--space-md);
  height: 88px;
  padding: 0 var(--space-md);
  color: inherit;
  text-decoration: none;
  background: var(--bg-surface);
  border-radius: var(--radius-card);
  transition: background-color var(--dur-fast) var(--ease-out);
}

.activity__ghost {
  height: 88px;
}

.activity__row:hover {
  background: var(--bg-elevated);
}

.activity__date {
  text-align: right;
  white-space: nowrap;
}

@media (max-width: 767px) {
  .activity__ghost {
    height: 120px;
  }

  .activity__row {
    grid-template-columns: 56px minmax(0, 1fr) auto;
    height: auto;
    padding: var(--space-sm) var(--space-md);
  }

  .activity__row :deep(.vote-body) {
    grid-column: 1 / -1;
    grid-row: 2;
  }
}
</style>
