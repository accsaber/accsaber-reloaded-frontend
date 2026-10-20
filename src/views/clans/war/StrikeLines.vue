<script setup lang="ts">
import type { StrikeLine } from './warStrike'

defineProps<{
  lines: StrikeLine[]
}>()
</script>

<template>
  <dl class="strike-lines">
    <div
      v-for="line in lines"
      :key="line.label"
      class="strike-lines__line"
      :class="{ 'strike-lines__line--muted': line.muted, 'strike-lines__line--result': line.label === '=' }"
    >
      <dt>{{ line.label }}</dt>
      <dd class="strike-lines__value">{{ line.value }}</dd>
      <dd v-if="line.detail" class="strike-lines__detail">{{ line.detail }}</dd>
    </div>
  </dl>
</template>

<style scoped>
.strike-lines {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  margin: 0;
}

.strike-lines__line {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  column-gap: var(--space-sm);
  color: var(--text-primary);
}

.strike-lines__line--muted {
  color: var(--text-tertiary);
}

.strike-lines__line--result {
  padding-top: var(--space-xs);
  border-top: 1px solid var(--bg-overlay);
  font-weight: 600;
}

.strike-lines__value {
  margin: 0;
  font-family: var(--font-mono);
  text-align: right;
}

.strike-lines__detail {
  grid-column: 1 / -1;
  margin: 0;
  color: var(--text-tertiary);
}
</style>
