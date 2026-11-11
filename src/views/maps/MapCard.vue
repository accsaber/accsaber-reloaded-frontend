<script setup lang="ts">
import { useTiltEffect } from '@/composables/useTiltEffect'
import { useCategoryStore } from '@/stores/categories'
import { onImageError } from '@/utils/media'
import type { MapDisplay } from '@/types/display'
import { computed, ref } from 'vue'
import { RouterLink, type RouteLocationRaw } from 'vue-router'
import SongTitle from '@/components/domain/SongTitle.vue'
import ComplexityBadge from '@/components/domain/ComplexityBadge.vue'
import DifficultyBadge from '@/components/domain/DifficultyBadge.vue'

const props = defineProps<{
  map: MapDisplay
  to: RouteLocationRaw
}>()

const categoryStore = useCategoryStore()
const cardRef = ref<HTMLElement | null>(null)
const { style: tiltStyle } = useTiltEffect(cardRef)

const categoryName = computed(() => categoryStore.getCategoryInfo(props.map.categoryCode)?.name ?? props.map.categoryCode)
const handleCoverError = (e: Event) => onImageError(props.map.coverFallbackUrl)(e)
</script>

<template>
  <RouterLink v-slot="{ href, navigate }" :to="to" custom>
    <a ref="cardRef" class="map-card" :href="href" :style="tiltStyle" @click="navigate">
      <div class="map-card__image-wrap">
        <img class="map-card__cover" data-shared="cover" :src="map.coverUrl" :alt="map.songName" loading="lazy" decoding="async"
          @error="handleCoverError" />
      </div>
      <div class="map-card__body">
        <SongTitle class="map-card__line card-title" :name="map.songName" :sub-name="map.songSubName" />
        <div class="map-card__identity">
          <div class="map-card__labels">
            <span class="map-card__category" :style="{ color: categoryStore.getAccent(map.categoryCode) }">
              {{ categoryName }}
            </span>
            <DifficultyBadge :difficulty="map.difficulty" />
          </div>
          <ComplexityBadge :complexity="map.complexity" />
        </div>
        <span class="map-card__line map-card__credits">{{ map.artistName }} · {{ map.mapperName }}</span>
      </div>
    </a>
  </RouterLink>
</template>

<style scoped>
.map-card {
  display: block;
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  overflow: hidden;
  text-decoration: none;
  color: inherit;
  transition:
    border-color var(--dur-fast) var(--ease-out),
    transform var(--dur-fast) var(--ease-out);
  will-change: transform;
}

.map-card:hover {
  border-color: var(--text-tertiary);
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
  gap: var(--space-sm);
}

.map-card__line {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.map-card__identity {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
}

.map-card__labels {
  display: flex;
  align-items: baseline;
  gap: var(--space-sm);
  min-width: 0;
}

.map-card__category {
  font-size: var(--text-caption);
  font-weight: 600;
  white-space: nowrap;
}

.map-card__credits {
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

@media (max-width: 767px) {
  .map-card__body {
    padding: var(--space-sm);
  }

  .map-card__labels {
    flex-direction: column;
    gap: 0;
  }
}
</style>
