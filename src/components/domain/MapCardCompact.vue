<script setup lang="ts">
import GlowImage from '@/components/common/GlowImage.vue';
import type { MapDisplay } from '@/types/display';
import { isRankingSubdomain } from '@/utils/subdomain';
import { computed } from 'vue';
import { useRouter, type RouteLocationRaw } from 'vue-router';
import ComplexityBadge from './ComplexityBadge.vue';
import DifficultyBadge from './DifficultyBadge.vue';

const props = defineProps<{
  map: MapDisplay
  to: RouteLocationRaw
}>()

const router = useRouter()

const href = computed(() => router.resolve(props.to).href)

function handleClick(event: MouseEvent) {
  if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
  event.preventDefault()
  router.push(props.to)
}
</script>

<template>
  <a class="map-card-compact" :href="href" @click="handleClick">
    <GlowImage :src="map.coverUrl" :alt="map.songName" :size="80" class="map-card-compact__cover" />
    <div class="map-card-compact__info">
      <span class="map-card-compact__song">{{ map.songName }}</span>
      <div class="map-card-compact__primary">
        <DifficultyBadge :difficulty="map.difficulty" />
        <ComplexityBadge :complexity="map.complexity" />
      </div>
      <span class="map-card-compact__secondary">
        <span class="map-card-compact__artist">{{ map.artistName }}<template v-if="isRankingSubdomain && map.beatsaverCode"> ({{ map.beatsaverCode }})</template></span>
        <span class="map-card-compact__sep">·</span>
        <span class="map-card-compact__mapper">{{ map.mapperName }}</span>
      </span>
    </div>
  </a>
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
  text-decoration: none;
  color: inherit;
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
  gap: var(--space-xs);
  min-width: 0;
}

.map-card-compact__song {
  font-size: var(--text-body);
  font-weight: 600;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.map-card-compact__primary {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  flex-wrap: wrap;
}

.map-card-compact__secondary {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  min-width: 0;
}

.map-card-compact__artist,
.map-card-compact__mapper {
  font-size: var(--text-caption);
  color: var(--text-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.map-card-compact__artist {
  color: var(--text-secondary);
  flex-shrink: 1;
  min-width: 0;
}

.map-card-compact__mapper {
  flex-shrink: 1;
  min-width: 0;
}

.map-card-compact__sep {
  color: var(--text-tertiary);
  flex-shrink: 0;
}
</style>
