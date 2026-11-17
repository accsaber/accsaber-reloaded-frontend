<script setup lang="ts">
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import { useCategoryStore } from '@/stores/categories'
import type { MapDifficultyResponse } from '@/types/api/maps'
import type { CategoryInfo } from '@/types/display'
import type { VNode } from 'vue'

defineProps<{
  categories: CategoryInfo[]
  groups: Map<string, MapDifficultyResponse[]>
  loading?: boolean
}>()

defineSlots<{
  card(props: { diff: MapDifficultyResponse }): VNode[]
}>()

const GHOST_CARDS = 3

const categoryStore = useCategoryStore()
</script>

<template>
  <div class="cat-columns" :style="{ '--cat-count': categories.length }">
    <section v-for="cat in categories" :key="cat.code" class="cat-columns__column">
      <h3 class="cat-columns__head">
        <span :style="{ color: cat.accent }">{{ categoryStore.getShortName(cat.code) }}</span>
        <span v-if="!loading" class="caption">{{ groups.get(cat.code)?.length ?? 0 }}</span>
      </h3>
      <div class="cat-columns__cards">
        <template v-if="loading">
          <SkeletonLoader v-for="i in GHOST_CARDS" :key="i" class="placeholder" height="56px" />
        </template>
        <template v-else>
          <template v-for="diff in groups.get(cat.code) ?? []" :key="diff.id">
            <slot name="card" :diff="diff" />
          </template>
          <p v-if="!groups.get(cat.code)?.length" class="caption cat-columns__empty">No maps</p>
        </template>
      </div>
    </section>
  </div>
</template>

<style scoped>
.cat-columns {
  display: grid;
  grid-template-columns: repeat(var(--cat-count, 3), minmax(0, 1fr));
  gap: var(--space-md);
  align-items: start;
}

.cat-columns__column {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  padding: var(--space-md);
  background: var(--bg-surface);
  border-radius: var(--radius-card);
}

.cat-columns__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-sm);
  margin: 0;
  font-size: var(--text-card-title);
  font-weight: 600;
}

.cat-columns__cards {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.cat-columns__empty {
  display: flex;
  align-items: center;
  min-height: 56px;
}

@media (max-width: 1023px) {
  .cat-columns {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
