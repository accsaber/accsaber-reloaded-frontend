<script setup lang="ts">
import type { DistributionEntryResponse } from '@/types/api/statistics'
import { computed } from 'vue'

const props = defineProps<{
  title: string
  entries: DistributionEntryResponse[]
}>()

const entries = computed(() => props.entries ?? [])
const maxCount = computed(() => Math.max(...entries.value.map((e) => e.count), 1))
const total = computed(() => entries.value.reduce((sum, e) => sum + e.count, 0))

function share(count: number): string {
  if (total.value === 0) return '0%'
  return `${((count / total.value) * 100).toFixed(0)}%`
}
</script>

<template>
  <figure class="histogram">
    <figcaption class="histogram__head">
      <h4 class="histogram__title">{{ title }}</h4>
    </figcaption>
    <div v-if="entries.length" class="histogram__plot">
      <div v-for="entry in entries" :key="entry.label" class="histogram__col"
        :title="`${entry.label}: ${entry.count.toLocaleString()} (${share(entry.count)})`">
        <span class="histogram__value">{{ entry.count.toLocaleString() }}</span>
        <span class="histogram__bar" :style="{ '--fill': `${(entry.count / maxCount) * 100}%` }" />
        <span class="histogram__tick">{{ entry.label }}</span>
      </div>
    </div>
    <p v-else class="histogram__empty">No measurable rows yet.</p>
  </figure>
</template>

<style scoped>
.histogram {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  margin: 0;
  padding: var(--space-md);
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-modal);
}

.histogram__head {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.histogram__title {
  margin: 0;
  font-size: var(--text-caption);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-secondary);
}

.histogram__plot {
  display: flex;
  align-items: flex-end;
  gap: 3px;
  min-height: 132px;
}

.histogram__col {
  display: flex;
  flex: 1 1 0;
  flex-direction: column;
  align-items: center;
  gap: var(--space-xs);
  min-width: 0;
}

.histogram__value {
  font-family: var(--font-mono);
  font-size: 0.625rem;
  color: var(--text-tertiary);
}

.histogram__bar {
  width: 100%;
  height: var(--fill);
  min-height: 2px;
  background: color-mix(in srgb, var(--page-accent) 65%, transparent);
  border-top: 2px solid var(--page-accent);
  border-radius: 1px 1px 0 0;
  transition: height 200ms ease-out;
}

.histogram__col:hover .histogram__bar {
  background: var(--page-accent);
}

.histogram__tick {
  font-size: 0.5625rem;
  color: var(--text-tertiary);
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

.histogram__empty {
  margin: 0;
  padding: var(--space-lg) 0;
  text-align: center;
  font-size: var(--text-body);
  color: var(--text-tertiary);
}

@media (prefers-reduced-motion: reduce) {
  .histogram__bar {
    transition: none;
  }
}
</style>
