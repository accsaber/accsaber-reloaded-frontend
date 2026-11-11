<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import MapCardCompact from '@/components/domain/MapCardCompact.vue'
import { usePlaylistDownload } from '@/composables/usePlaylistDownload'
import { useCategoryStore } from '@/stores/categories'
import type { PublicBatchResponse } from '@/types/api/batches'
import type { MapDisplay } from '@/types/display'
import { groupBatchByCategory } from '@/utils/batches'
import { formatRelativeDate } from '@/utils/formatters'
import type { RouteLocationRaw } from 'vue-router'

defineProps<{
  batches: PublicBatchResponse[]
  loading: boolean
  refreshing: boolean
  mapRouteTo: (m: Pick<MapDisplay, 'id' | 'difficultyId' | 'difficulty' | 'characteristic' | 'beatsaverCode'>) => RouteLocationRaw
}>()

const categoryStore = useCategoryStore()
const { downloadBatchPlaylist } = usePlaylistDownload()

function batchDifficultiesByCategory(batch: PublicBatchResponse) {
  return groupBatchByCategory(
    batch,
    (id) => categoryStore.getCategoryCode(id),
    (code) => categoryStore.getAccent(code),
    (code) => categoryStore.getCategoryInfo(code)?.name ?? code,
  )
}
</script>

<template>
  <div v-if="loading" class="batches">
    <div v-for="i in 2" :key="i" class="batch">
      <SkeletonLoader width="240px" height="52px" />
      <div class="batch-cards">
        <SkeletonLoader v-for="j in 8" :key="j" height="98px" />
      </div>
    </div>
  </div>
  <EmptyState v-else-if="batches.length === 0" message="No released batches found." />
  <div v-else class="batches stagger" :class="{ refreshing }" :style="{ '--n': batches.length }">
    <section v-for="(batch, i) in batches" :key="batch.id" class="batch" :style="{ '--i': i }">
      <div class="batch-header">
        <div class="batch-heading">
          <h2 class="section-title">{{ batch.name }}</h2>
          <span class="caption">
            {{ batch.difficulties.length }} difficulties<template v-if="batch.releasedAt"> · {{ formatRelativeDate(batch.releasedAt) }}</template>
          </span>
        </div>
        <BaseButton :aria-label="`Download ${batch.name} playlist`"
          @click="downloadBatchPlaylist(batch.id, batch.name)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Playlist
        </BaseButton>
      </div>
      <p v-if="batch.description" class="caption batch-desc">{{ batch.description }}</p>
      <div v-for="group in batchDifficultiesByCategory(batch)" :key="group.categoryCode" class="batch-category">
        <span class="field-label" :style="{ color: group.accent }">{{ group.name }}</span>
        <div class="batch-cards">
          <MapCardCompact v-for="m in group.diffs" :key="m.difficultyId" :map="m" :to="mapRouteTo(m)" />
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.batches {
  display: flex;
  flex-direction: column;
  gap: var(--space-2xl);
}

.batch {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.batch-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
}

.batch-heading {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  min-width: 0;
}

.batch-heading .section-title {
  overflow-wrap: anywhere;
}

.batch-desc {
  max-width: 65ch;
}

.batch-category {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.batch-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-sm);
}
</style>
