<script setup lang="ts">
import { STATS_SECTIONS, type SectionKey } from './sections'

defineProps<{ modelValue: SectionKey }>()
const emit = defineEmits<{ 'update:modelValue': [value: SectionKey] }>()
</script>

<template>
  <nav class="section-toggle" aria-label="Statistics sections">
    <button v-for="section in STATS_SECTIONS" :key="section.key" type="button" class="section-toggle__btn"
      :class="{ 'section-toggle__btn--active': modelValue === section.key }"
      :aria-current="modelValue === section.key ? 'page' : undefined"
      @click="emit('update:modelValue', section.key)">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <template v-if="section.key === 'leaderboards'">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </template>
        <template v-else-if="section.key === 'items'">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <polyline points="3.29 7 12 12 20.71 7" />
          <line x1="12" y1="22" x2="12" y2="12" />
        </template>
        <template v-else-if="section.key === 'missions'">
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="12" cy="12" r="1" />
        </template>
        <template v-else-if="section.key === 'campaigns'">
          <circle cx="6" cy="18" r="2.5" />
          <circle cx="12" cy="6" r="2.5" />
          <circle cx="18" cy="15" r="2.5" />
          <line x1="7.7" y1="16.1" x2="10.3" y2="8" />
          <line x1="14.2" y1="7.3" x2="16.6" y2="12.9" />
        </template>
        <template v-else-if="section.key === 'events'">
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <line x1="3" y1="10" x2="21" y2="10" />
          <line x1="8" y1="3" x2="8" y2="7" />
          <line x1="16" y1="3" x2="16" y2="7" />
        </template>
        <template v-else>
          <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
          <path d="M22 12A10 10 0 0 0 12 2v10z" />
        </template>
      </svg>
      {{ section.label }}
    </button>
  </nav>
</template>

<style scoped>
.section-toggle {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--space-sm);
}

.section-toggle__btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-pill);
  border: 1px solid var(--bg-overlay);
  background: var(--bg-surface);
  color: var(--text-secondary);
  font-family: inherit;
  font-size: var(--text-body);
  font-weight: 600;
  cursor: pointer;
  transition: color 150ms ease, background 150ms ease, border-color 150ms ease;
}

.section-toggle__btn:hover {
  border-color: var(--text-tertiary);
  background: var(--bg-elevated);
}

.section-toggle__btn--active {
  border-color: color-mix(in srgb, var(--page-accent) 50%, transparent);
  background: color-mix(in srgb, var(--page-accent) 8%, var(--bg-surface));
  color: var(--page-accent);
}

.section-toggle__btn--active:hover {
  border-color: var(--page-accent);
  background: color-mix(in srgb, var(--page-accent) 12%, var(--bg-surface));
}

.section-toggle__btn svg {
  flex-shrink: 0;
  opacity: 0.7;
}

.section-toggle__btn--active svg {
  opacity: 1;
}

@media (max-width: 767px) {
  .section-toggle__btn {
    padding: var(--space-sm) var(--space-sm);
    font-size: var(--text-caption);
  }
}
</style>
