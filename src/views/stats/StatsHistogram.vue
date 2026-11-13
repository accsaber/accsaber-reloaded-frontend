<script setup lang="ts">
import type { DistributionEntryResponse } from '@/types/api/statistics'
import { computed } from 'vue'

const props = defineProps<{
  title: string
  entries: DistributionEntryResponse[]
}>()

const entries = computed(() => props.entries ?? [])
const maxCount = computed(() => Math.max(...entries.value.map((e) => e.count), 1))
</script>

<template>
  <figure class="histogram">
    <figcaption>
      <h4 class="field-label">{{ title }}</h4>
      <p class="caption">
        <slot />
      </p>
    </figcaption>
    <div v-if="entries.length" class="histogram__plot">
      <div v-for="entry in entries" :key="entry.label" class="histogram__col">
        <span class="histogram__value">{{ entry.count.toLocaleString() }}</span>
        <span class="histogram__track">
          <span class="histogram__bar" :style="{ '--fill': entry.count / maxCount }" />
        </span>
        <span class="caption histogram__tick">{{ entry.label }}</span>
      </div>
    </div>
    <p v-else class="caption">Nothing to measure yet</p>
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
  border-radius: var(--radius-card);
}

.histogram h4,
.histogram p {
  margin: 0;
}

.histogram__plot {
  display: flex;
  gap: var(--space-xs);
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
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

.histogram__track {
  display: flex;
  align-items: flex-end;
  width: 100%;
  height: 96px;
}

.histogram__bar {
  width: 100%;
  height: 100%;
  background: var(--page-accent, var(--accent));
  border-radius: var(--radius-xs) var(--radius-xs) 0 0;
  transform: scaleY(max(var(--fill), 0.02));
  transform-origin: bottom;
  transition: transform var(--dur-enter) var(--ease-out);
}

.histogram__tick {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
