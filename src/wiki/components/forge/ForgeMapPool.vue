<script setup lang="ts">
import type { PublicMapDifficultyResponse } from '@/types/api/maps'
import { pickCoverUrl } from '@/composables/useAvatarFallback'
import { computed } from 'vue'

const props = defineProps<{
  total: number
  sample: PublicMapDifficultyResponse[]
  picked: PublicMapDifficultyResponse | null
}>()

const TILE_LIMIT = 32

const tiles = computed(() => {
  const picked = props.picked
  const rest = props.sample.filter((d) => d.id !== picked?.id).slice(0, TILE_LIMIT - (picked ? 1 : 0))
  const all = picked ? [picked, ...rest] : rest
  return all.map((difficulty) => ({
    difficulty,
    cover: pickCoverUrl(difficulty),
    chosen: difficulty.id === picked?.id,
  }))
})

const overflow = computed(() => Math.max(0, props.total - tiles.value.length))
</script>

<template>
  <div class="pool">
    <div class="pool__grid">
      <span
        v-for="tile in tiles"
        :key="tile.difficulty.id"
        class="pool__tile"
        :class="{ 'pool__tile--chosen': tile.chosen }"
        :title="`${tile.difficulty.songName} · ${tile.difficulty.difficulty} · complexity ${(tile.difficulty.complexity ?? 0).toFixed(2)}`"
      >
        <img
          v-if="tile.cover"
          class="pool__cover"
          :src="tile.cover"
          alt=""
          loading="lazy"
          decoding="async"
        />
      </span>
      <span v-if="overflow > 0" class="pool__overflow">+{{ overflow }}</span>
    </div>

    <div v-if="picked" class="pool__picked">
      <img
        v-if="pickCoverUrl(picked)"
        class="pool__picked-cover"
        :src="pickCoverUrl(picked) ?? undefined"
        alt=""
        loading="lazy"
      />
      <span class="pool__picked-text">
        <span class="pool__picked-song">{{ picked.songName }}</span>
        <span class="pool__picked-meta">
          {{ picked.songAuthor }} · mapped by {{ picked.mapAuthor }}
        </span>
        <span class="pool__picked-stats">
          {{ picked.difficulty }} · complexity {{ (picked.complexity ?? 0).toFixed(2) }}
          <template v-if="picked.statistics?.maxAp">
            · best on record {{ Math.round(picked.statistics.maxAp).toLocaleString() }} AP
          </template>
        </span>
      </span>
    </div>
  </div>
</template>

<style scoped>
.pool {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.pool__grid {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.pool__tile {
  width: 34px;
  height: 34px;
  border-radius: var(--radius-btn);
  border: 1px solid var(--bg-overlay);
  background: var(--bg-elevated);
  overflow: hidden;
  opacity: 0.4;
  transition: opacity 160ms ease, border-color 160ms ease;
}

.pool__tile--chosen {
  opacity: 1;
  border-color: var(--accent);
  outline: 1px solid var(--accent);
  outline-offset: -2px;
}

.pool__cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.pool__overflow {
  display: inline-flex;
  align-items: center;
  padding: 0 var(--space-sm);
  height: 34px;
  border-radius: var(--radius-btn);
  border: 1px dashed var(--bg-overlay);
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  color: var(--text-tertiary);
}

.pool__picked {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-sm) var(--space-md);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  background: var(--bg-surface);
}

.pool__picked-cover {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-btn);
  object-fit: cover;
  flex-shrink: 0;
}

.pool__picked-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.pool__picked-song {
  font-weight: 600;
  color: var(--text-primary);
}

.pool__picked-meta,
.pool__picked-stats {
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

.pool__picked-stats {
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  color: var(--text-tertiary);
}

@media (prefers-reduced-motion: reduce) {
  .pool__tile {
    transition: none;
  }
}
</style>
