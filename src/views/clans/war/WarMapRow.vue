<script setup lang="ts">
import CategoryBadge from '@/components/domain/CategoryBadge.vue'
import ComplexityBadge from '@/components/domain/ComplexityBadge.vue'
import DifficultyBadge from '@/components/domain/DifficultyBadge.vue'
import SongTitle from '@/components/domain/SongTitle.vue'
import { buildMapRoute } from '@/utils/mapRoute'
import { pickCoverUrl } from '@/utils/media'
import { useCategoryStore } from '@/stores/categories'
import type { PublicMapDifficultyResponse } from '@/types/api/maps'
import { computed } from 'vue'

const props = defineProps<{
  difficulty: PublicMapDifficultyResponse
  plain?: boolean
}>()

const categoryStore = useCategoryStore()
const mapRoute = computed(() => buildMapRoute({ ...props.difficulty, difficultyId: props.difficulty.id }))
const categoryCode = computed(() => categoryStore.getCategoryCode(props.difficulty.categoryId) ?? 'overall')
</script>

<template>
  <div class="war-map">
    <img class="war-map__cover" :src="pickCoverUrl(difficulty)" alt="" loading="lazy" decoding="async" />
    <div class="war-map__body">
      <RouterLink class="war-map__title" :to="mapRoute">
        <SongTitle :name="difficulty.songName" :sub-name="difficulty.songSubName" />
      </RouterLink>
      <span class="war-map__badges">
        <CategoryBadge v-if="!plain" :category="categoryCode" size="sm" />
        <DifficultyBadge :difficulty="difficulty.difficulty" />
        <ComplexityBadge v-if="!plain && difficulty.complexity != null" :complexity="difficulty.complexity" />
      </span>
    </div>
    <div class="war-map__trailing">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.war-map {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  min-width: 0;
}

.war-map__cover {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  object-fit: cover;
  border-radius: var(--radius-btn);
}

.war-map__body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.war-map__title {
  min-width: 0;
  font-weight: 600;
  color: var(--text-primary);
  text-decoration: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.war-map__title:hover {
  color: var(--page-accent, var(--accent));
}

.war-map__badges {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-sm);
}

.war-map__trailing {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: var(--space-sm);
}
</style>
