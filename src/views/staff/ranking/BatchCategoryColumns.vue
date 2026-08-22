<script setup lang="ts">
import type { MapDifficultyResponse } from '@/types/api/maps'
import type { CategoryInfo } from '@/types/display'
import type { VNode } from 'vue'

defineProps<{
  categories: CategoryInfo[]
  groups: Map<string, MapDifficultyResponse[]>
  emptyLabel?: string
}>()

defineSlots<{
  card(props: { diff: MapDifficultyResponse }): VNode[]
}>()
</script>

<template>
  <div class="cat-columns" :style="{ '--cat-count': categories.length }">
    <div
      v-for="cat in categories"
      :key="cat.code"
      class="cat-columns__column"
      :style="{ '--cat-accent': cat.accent }"
    >
      <div class="cat-columns__header">
        <span class="cat-columns__dot" :style="{ background: cat.accent }" />
        <span class="cat-columns__name">{{ cat.name }}</span>
        <span class="cat-columns__count">{{ groups.get(cat.code)?.length ?? 0 }}</span>
      </div>
      <div class="cat-columns__cards">
        <template v-for="diff in groups.get(cat.code) ?? []" :key="diff.id">
          <slot name="card" :diff="diff" />
        </template>
        <div v-if="(groups.get(cat.code)?.length ?? 0) === 0" class="cat-columns__empty">
          {{ emptyLabel ?? 'No maps' }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cat-columns {
  display: grid;
  grid-template-columns: repeat(var(--cat-count, 3), 1fr);
  gap: var(--space-md);
}

.cat-columns__column {
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-top: 2px solid var(--cat-accent, var(--accent));
  border-radius: var(--radius-card);
  padding: var(--space-md);
  min-height: 200px;
}

.cat-columns__header {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  margin-bottom: var(--space-md);
}

.cat-columns__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.cat-columns__name {
  font-size: var(--text-caption);
  font-weight: 600;
  color: var(--text-primary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.cat-columns__count {
  font-size: var(--text-caption);
  color: var(--text-tertiary);
  font-family: var(--font-mono);
  margin-left: auto;
}

.cat-columns__cards {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.cat-columns__empty {
  color: var(--text-tertiary);
  font-size: var(--text-caption);
  text-align: center;
  padding: var(--space-xl) 0;
}

@media (max-width: 1023px) {
  .cat-columns {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 767px) {
  .cat-columns {
    grid-template-columns: 1fr;
  }
}
</style>
