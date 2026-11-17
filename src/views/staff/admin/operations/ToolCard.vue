<script setup lang="ts">
import type { OpState } from './operationState'

defineProps<{
  title: string
  results?: OpState[]
}>()
</script>

<template>
  <section class="tool-card">
    <header class="tool-card__head">
      <h3 class="card-title">{{ title }}</h3>
      <slot name="head" />
    </header>
    <slot />
    <footer v-if="$slots.actions || results?.some((r) => r.result)" class="tool-card__foot">
      <slot name="actions" />
      <span class="caption tool-card__result" role="status">
        <span v-for="(op, i) in results?.filter((r) => r.result)" :key="i" :class="{ 'tool-card__result--error': !op.ok }">
          {{ op.result }}
        </span>
      </span>
    </footer>
  </section>
</template>

<style scoped>
.tool-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  min-width: 0;
  padding: var(--space-md) var(--space-lg);
  background: var(--bg-surface);
  border-radius: var(--radius-card);
}

.tool-card__head,
.tool-card__foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-sm);
}

.tool-card__head {
  justify-content: space-between;
}

.tool-card__foot {
  margin-top: auto;
}

.tool-card__result {
  display: inline-flex;
  flex-direction: column;
  min-height: 1lh;
}

.tool-card__result--error {
  color: var(--error);
}
</style>
