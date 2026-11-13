<script setup lang="ts">
import CoverImage from '@/components/common/CoverImage.vue'

defineProps<{
  name: string
  meta?: string
  icon?: string | null
  iconSlot?: boolean
}>()
</script>

<template>
  <span class="stats-name">
    <span v-if="iconSlot" class="stats-name__icon">
      <CoverImage v-if="icon" :src="icon" alt="" :size="28" hide-on-error />
    </span>
    <span class="stats-name__text">
      <span class="stats-name__name">{{ name }}</span>
      <span v-if="meta" class="caption stats-name__meta">{{ meta }}</span>
    </span>
  </span>
</template>

<style scoped>
.stats-name {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  min-width: 0;
}

.stats-name__icon {
  flex: none;
  width: 28px;
  height: 28px;
}

.stats-name__text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.stats-name__name,
.stats-name__meta {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  line-height: 1.15;
}

.stats-name__name {
  font-weight: 500;
  line-height: 1.25;
  color: var(--text-primary);
}
</style>
