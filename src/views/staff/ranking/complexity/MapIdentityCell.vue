<script setup lang="ts">
import GlowImage from '@/components/common/GlowImage.vue'
import CategoryBadge from '@/components/domain/CategoryBadge.vue'
import DifficultyBadge from '@/components/domain/DifficultyBadge.vue'
import SongTitle from '@/components/domain/SongTitle.vue'
import { pickCoverFallback, pickCoverUrl } from '@/composables/useAvatarFallback'
import type { ComplexityDifficultyRow } from '@/types/api/complexity'
import type { CategoryCode } from '@/types/display'
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  row: ComplexityDifficultyRow
  cover?: boolean
  size?: number
}>(), {
  cover: false,
  size: 32,
})

const coverUrl = computed(() => pickCoverUrl(props.row))
const coverFallback = computed(() => pickCoverFallback(props.row))
</script>

<template>
  <div class="map-identity">
    <GlowImage v-if="cover" :src="coverUrl" alt="" :size="size" :fallback-src="coverFallback" />
    <div class="map-identity__text">
      <SongTitle class="map-identity__name" :name="row.songName" :sub-name="row.songSubName" />
      <span class="map-identity__meta">
        <CategoryBadge :category="(row.categoryCode as CategoryCode)" size="sm" />
        <DifficultyBadge :difficulty="row.difficulty" />
        <span v-if="row.status !== 'RANKED'" class="status-pill"
          :class="`status-pill--${row.status.toLowerCase()}`">{{ row.status }}</span>
        <span class="map-identity__author">{{ row.songAuthor }}</span>
      </span>
    </div>
  </div>
</template>

<style scoped>
.map-identity {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  min-width: 0;
}

.map-identity__text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.map-identity__name {
  color: var(--text-primary);
  font-size: var(--text-body);
  font-weight: 500;
}

.map-identity__meta {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  min-width: 0;
}

.map-identity__author {
  color: var(--text-secondary);
  font-size: var(--text-caption);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
