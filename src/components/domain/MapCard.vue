<script setup lang="ts">
import { useTiltEffect } from '@/composables/useTiltEffect'
import { useCategoryStore } from '@/stores/categories'
import type { MapDisplay } from '@/types/display'
import { ref } from 'vue'
import ComplexityBadge from './ComplexityBadge.vue'

const props = defineProps<{
  map: MapDisplay
}>()

defineEmits<{
  click: []
}>()

const categoryStore = useCategoryStore()
const cardRef = ref<HTMLElement | null>(null)
const { style: tiltStyle } = useTiltEffect(cardRef)

function categoryDotColor(): string {
  return categoryStore.getAccent(props.map.categoryCode)
}
</script>

<template>
  <div ref="cardRef" class="map-card" :style="tiltStyle" tabindex="0" role="button" @click="$emit('click')"
    @keydown.enter="$emit('click')">
    <div class="map-card__image-wrap">
      <img class="map-card__cover" :src="map.coverUrl" :alt="map.songName" loading="lazy" />
    </div>
    <div class="map-card__body">
      <div class="map-card__title-row">
        <span class="map-card__dot" :style="{ background: categoryDotColor() }" />
        <span class="map-card__song">{{ map.songName }}</span>
      </div>
      <span class="map-card__artist">{{ map.artistName }}</span>
      <div class="map-card__footer">
        <span class="map-card__mapper">{{ map.mapperName }}</span>
        <div class="map-card__badges">
          <span v-if="map.difficultyLabel" class="map-card__diff">{{ map.difficultyLabel }}</span>
          <ComplexityBadge :complexity="map.complexity" :difficulty="map.difficulty" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.map-card {
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  overflow: hidden;
  cursor: pointer;
  transition: border-color 150ms ease, box-shadow 150ms ease, transform 150ms ease;
  will-change: transform;
}

.map-card:hover {
  border-color: var(--text-tertiary);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  transform: scale(1.01);
}

.map-card__image-wrap {
  aspect-ratio: 1 / 1;
  overflow: hidden;
}

.map-card__cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.map-card__body {
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.map-card__title-row {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.map-card__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.map-card__song {
  font-size: var(--text-card-title);
  font-weight: 600;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.map-card__artist {
  font-size: var(--text-caption);
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.map-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
  margin-top: var(--space-xs);
}

.map-card__mapper {
  font-size: var(--text-caption);
  color: var(--text-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.map-card__badges {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  flex-shrink: 0;
}

.map-card__diff {
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

@media (prefers-reduced-motion: reduce) {
  .map-card:hover {
    transform: none;
  }
}
</style>
