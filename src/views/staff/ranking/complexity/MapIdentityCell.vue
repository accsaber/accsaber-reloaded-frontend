<script setup lang="ts">
import CoverImage from '@/components/common/CoverImage.vue'
import DifficultyBadge from '@/components/domain/DifficultyBadge.vue'
import MapNameCell from '@/components/domain/MapNameCell.vue'
import { useCategoryStore } from '@/stores/categories'
import type { ComplexityDifficultyRow } from '@/types/api/complexity'
import { MAP_STATUS_LABELS } from '@/utils/constants'

withDefaults(defineProps<{
  row: ComplexityDifficultyRow
  size?: number
}>(), {
  size: 44,
})

const categoryStore = useCategoryStore()
</script>

<template>
  <div class="map-identity">
    <CoverImage :source="row.map" :size="size" />
    <MapNameCell :name="row.map.songName" :sub-name="row.map.songSubName" :artist="row.map.songAuthor ?? ''"
      :mapper="row.map.mapAuthor ?? ''">
      <DifficultyBadge :difficulty="row.map.difficulty" />
      <span class="map-identity__category" :style="{ color: categoryStore.getAccent(row.categoryCode) }">
        {{ categoryStore.getShortName(row.categoryCode) }}
      </span>
      <span v-if="row.status !== 'RANKED'" class="caption">{{ MAP_STATUS_LABELS[row.status] }}</span>
    </MapNameCell>
  </div>
</template>

<style scoped>
.map-identity {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  min-width: 0;
}

.map-identity__category {
  font-size: var(--text-caption);
  font-weight: 600;
  white-space: nowrap;
}
</style>
