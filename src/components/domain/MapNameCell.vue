<script setup lang="ts">
import SongTitle from '@/components/domain/SongTitle.vue'

defineProps<{
  name: string
  subName?: string | null
  artist: string
  mapper: string
}>()
</script>

<template>
  <div class="map-name">
    <SongTitle class="map-name__song" :name="name" :sub-name="subName" />
    <span class="map-name__line">
      <span class="map-name__credits">{{ artist }} · {{ mapper }}</span>
      <slot />
    </span>
  </div>
</template>

<style scoped>
.map-name {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.map-name__song {
  font-weight: 500;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.map-name__line {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  min-width: 0;
}

.map-name__credits {
  min-width: 0;
  font-size: var(--text-caption);
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
