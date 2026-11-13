<script setup lang="ts">
import CoverImage from '@/components/common/CoverImage.vue'
import SongTitle from '@/components/domain/SongTitle.vue'
import { useCategoryStore } from '@/stores/categories'
import type { MapDifficultyRef } from '@/types/api/common'
import { formatDifficulty } from '@/utils/mappers'
import { buildMapRoute } from '@/utils/mapRoute'
import { computed } from 'vue'

const props = defineProps<{ map: MapDifficultyRef }>()

const categoryStore = useCategoryStore()

const accent = computed(() =>
  categoryStore.getAccent((props.map.categoryId && categoryStore.getCategoryCode(props.map.categoryId)) || 'overall'),
)

const to = computed(() =>
  buildMapRoute({
    beatsaverCode: props.map.beatsaverCode ?? null,
    mapId: props.map.mapId,
    difficulty: props.map.difficulty ?? null,
    difficultyId: props.map.id ?? null,
    characteristic: props.map.characteristic ?? null,
  }),
)
</script>

<template>
  <router-link :to="to" class="stats-map" @click.stop>
    <CoverImage :source="map" :alt="map.songName" :size="32" />
    <span class="stats-map__text">
      <SongTitle class="stats-map__name" :name="map.songName" :sub-name="map.songSubName" />
      <span class="caption stats-map__meta">
        <span :style="{ color: accent }">{{ formatDifficulty(map.difficulty) }}</span>
        {{ map.mapAuthor }}
      </span>
    </span>
  </router-link>
</template>

<style scoped>
.stats-map {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  min-width: 0;
  text-decoration: none;
  color: inherit;
}

.stats-map__text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.stats-map__name,
.stats-map__meta {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.stats-map__name {
  font-weight: 500;
  line-height: 1.25;
  color: var(--text-primary);
  transition: color var(--dur-fast) var(--ease-out);
}

.stats-map:hover .stats-map__name {
  color: var(--page-accent, var(--accent));
}

.stats-map__meta {
  line-height: 1.15;
}
</style>
