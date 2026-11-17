<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import SwapList from '@/components/common/SwapList.vue'
import MapCardCompact from '@/components/domain/MapCardCompact.vue'
import { usePlaylistDownload } from '@/composables/usePlaylistDownload'
import { useCategoryStore } from '@/stores/categories'
import type { PublicBatchResponse } from '@/types/api/batches'
import type { MapDisplay } from '@/types/display'
import type { BatchStatus } from '@/types/enums'
import { groupBatchByCategory } from '@/utils/batches'
import { formatRelativeDate } from '@/utils/formatters'
import { ref } from 'vue'
import type { RouteLocationRaw } from 'vue-router'

withDefaults(defineProps<{
  batches: PublicBatchResponse[]
  loading: boolean
  refreshing: boolean
  emptyMessage?: string
  collapsible?: boolean
  placeholders?: number
  mapRouteTo: (m: Pick<MapDisplay, 'id' | 'difficultyId' | 'difficulty' | 'characteristic' | 'beatsaverCode'>) => RouteLocationRaw
}>(), {
  emptyMessage: 'No released batches found.',
  placeholders: 2,
})

const open = ref(new Set<string>())

function toggle(id: string) {
  const next = new Set(open.value)
  if (!next.delete(id)) next.add(id)
  open.value = next
}

defineSlots<{
  actions?(props: { batch: PublicBatchResponse }): unknown
}>()

const UNRELEASED_LABEL: Partial<Record<BatchStatus, string>> = {
  DRAFT: 'Draft',
  RELEASE_READY: 'Release Ready',
}

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
  <EmptyState v-if="!loading && batches.length === 0" :message="emptyMessage" />
  <SwapList v-else class="batches" :class="{ 'batches--folded': collapsible }" :items="batches"
    :item-key="(batch) => batch.id" :loading="loading" :refreshing="refreshing" :placeholders="placeholders">
    <template #placeholder>
      <div class="batch placeholder">
        <SkeletonLoader width="240px" height="52px" />
        <div v-if="!collapsible" class="batch-cards">
          <SkeletonLoader v-for="j in 8" :key="j" height="98px" />
        </div>
      </div>
    </template>
    <template #default="{ item: batch, swap }">
      <section class="batch" v-bind="swap">
        <div class="batch-header">
          <component
            :is="collapsible ? 'button' : 'div'"
            class="batch-heading"
            :class="{ 'batch-heading--toggle pressable': collapsible }"
            :type="collapsible ? 'button' : undefined"
            :aria-expanded="collapsible ? open.has(batch.id) : undefined"
            @click="collapsible && toggle(batch.id)"
          >
            <svg v-if="collapsible" class="batch-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M6 9l6 6 6-6" />
            </svg>
            <span class="batch-titles">
              <h2 class="section-title">{{ batch.name }}</h2>
              <span class="caption">
                {{ batch.difficulties.length }} difficulties<template v-if="UNRELEASED_LABEL[batch.status]"> · {{ UNRELEASED_LABEL[batch.status] }}</template> · {{ formatRelativeDate(batch.releasedAt ?? batch.createdAt) }}
              </span>
            </span>
          </component>
          <span class="batch-actions">
            <slot name="actions" :batch="batch" />
            <BaseButton v-if="batch.difficulties.length" :aria-label="`Download ${batch.name} playlist`"
              @click="downloadBatchPlaylist(batch.id, batch.name)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Playlist
            </BaseButton>
          </span>
        </div>
        <Transition name="collapse">
          <div v-if="!collapsible || open.has(batch.id)" class="collapsible">
            <div class="batch-body">
              <p v-if="batch.description" class="caption batch-desc">{{ batch.description }}</p>
              <div v-for="group in batchDifficultiesByCategory(batch)" :key="group.categoryCode" class="batch-category">
                <span class="field-label" :style="{ color: group.accent }">{{ group.name }}</span>
                <div class="batch-cards">
                  <MapCardCompact v-for="m in group.diffs" :key="m.difficultyId" :map="m" :to="mapRouteTo(m)" />
                </div>
              </div>
            </div>
          </div>
        </Transition>
      </section>
    </template>
  </SwapList>
</template>

<style scoped>
.batches {
  display: flex;
  flex-direction: column;
  gap: var(--space-2xl);
}

.batches--folded {
  gap: var(--space-sm);
}

.batch {
  display: flex;
  flex-direction: column;
}

.batches--folded .batch {
  padding: var(--space-md);
  background: var(--bg-surface);
  border-radius: var(--radius-card);
}

.batch-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
}

.batch-heading {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  min-width: 0;
  min-height: 52px;
}

.batch-heading--toggle {
  flex: 1;
  padding: 0;
  font: inherit;
  color: inherit;
  text-align: left;
  background: none;
  border: none;
  cursor: pointer;
}

.batch-chevron {
  flex-shrink: 0;
  color: var(--text-secondary);
  transform: rotate(-90deg);
  transition: transform var(--dur-fast) var(--ease-out);
}

.batch-heading[aria-expanded='true'] .batch-chevron {
  transform: none;
}

.batch-titles {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  min-width: 0;
}

.batch-titles .section-title {
  overflow-wrap: anywhere;
}

.batch-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--space-sm);
}

.batch-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  padding-top: var(--space-md);
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

.batch.placeholder {
  gap: var(--space-md);
}

@media (max-width: 639px) {
  .batches--folded .batch-header {
    flex-wrap: wrap;
  }

  .batches--folded .batch-heading {
    flex-basis: 100%;
  }
}
</style>
