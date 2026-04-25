<script setup lang="ts">
import GlowImage from '@/components/common/GlowImage.vue';
import { useCategoryStore } from '@/stores/categories';
import type { MapDisplay } from '@/types/display';
import ComplexityBadge from './ComplexityBadge.vue';

const props = defineProps<{
  map: MapDisplay
}>()

defineEmits<{
  click: []
}>()

const categoryStore = useCategoryStore()

function categoryDotColor(): string {
  return categoryStore.getAccent(props.map.categoryCode)
}
</script>

<template>
  <div class="map-card-compact" tabindex="0" role="button" @click="$emit('click')" @keydown.enter="$emit('click')">
    <GlowImage :src="map.coverUrl" :alt="map.songName" :size="80" class="map-card-compact__cover" />
    <div class="map-card-compact__info">
      <div class="map-card-compact__title-row">
        <span class="map-card-compact__dot" :style="{ background: categoryDotColor() }" />
        <span class="map-card-compact__song">{{ map.songName }}</span>
      </div>
      <span class="map-card-compact__artist">{{ map.artistName }}<template v-if="map.beatsaverCode"> ({{ map.beatsaverCode }})</template></span>
      <div class="map-card-compact__meta">
        <span class="map-card-compact__mapper">{{ map.mapperName }}</span>
        <span v-if="map.difficultyLabel" class="map-card-compact__diff">{{ map.difficultyLabel }}</span>
        <ComplexityBadge :complexity="map.complexity" :difficulty="map.difficulty" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.map-card-compact {
  display: flex;
  gap: var(--space-md);
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  padding: var(--space-sm);
  cursor: pointer;
  transition: border-color 120ms ease;
  min-width: 260px;
}

.map-card-compact:hover {
  border-color: var(--text-tertiary);
}

.map-card-compact__cover {
  width: 80px;
  height: 80px;
  border-radius: var(--radius-btn);
  object-fit: cover;
  flex-shrink: 0;
}

.map-card-compact__info {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
  min-width: 0;
}

.map-card-compact__title-row {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.map-card-compact__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.map-card-compact__song {
  font-size: var(--text-body);
  font-weight: 600;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.map-card-compact__artist {
  font-size: var(--text-caption);
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.map-card-compact__meta {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-top: 2px;
}

.map-card-compact__mapper {
  font-size: var(--text-caption);
  color: var(--text-tertiary);
}

.map-card-compact__diff {
  font-size: var(--text-caption);
  color: var(--text-secondary);
}
</style>
