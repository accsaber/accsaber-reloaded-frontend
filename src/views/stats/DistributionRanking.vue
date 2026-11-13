<script setup lang="ts">
import type { DistributionEntryResponse } from '@/types/api/statistics'
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    title: string
    entries: DistributionEntryResponse[]
    maxEntries?: number
  }>(),
  { maxEntries: 8 },
)

const visibleEntries = computed(() => props.entries.slice(0, props.maxEntries))
const maxCount = computed(() => Math.max(...props.entries.map((e) => e.count), 1))
</script>

<template>
  <div class="distribution-ranking">
    <h3 class="card-title">{{ title }}</h3>
    <ol class="distribution-ranking__list" :style="{ '--rows': maxEntries }">
      <li v-for="entry in visibleEntries" :key="entry.label" class="distribution-ranking__row">
        <span class="distribution-ranking__bar" :style="{ '--progress': entry.count / maxCount }" />
        <span class="distribution-ranking__label">{{ entry.label }}</span>
        <span class="distribution-ranking__count">{{ entry.count.toLocaleString() }}</span>
      </li>
    </ol>
  </div>
</template>

<style scoped>
.distribution-ranking {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  min-width: 0;
}

.distribution-ranking__list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-height: calc(var(--rows) * 34px - 2px);
  margin: 0;
  padding: 0;
  list-style: none;
}

.distribution-ranking__row {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
  height: 32px;
  padding: 0 var(--space-sm);
  border-radius: var(--radius-btn);
  overflow: hidden;
}

.distribution-ranking__bar {
  position: absolute;
  inset: 0;
  background: var(--bg-overlay);
  transform-origin: left;
  transform: scaleX(var(--progress, 0));
  transition: transform var(--dur-enter) var(--ease-out);
}

.distribution-ranking__label,
.distribution-ranking__count {
  position: relative;
  font-size: var(--text-body);
  color: var(--text-primary);
}

.distribution-ranking__label {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.distribution-ranking__count {
  font-family: var(--font-mono);
}
</style>
