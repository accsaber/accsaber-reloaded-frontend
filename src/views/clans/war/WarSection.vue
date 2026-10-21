<script setup lang="ts">
defineProps<{
  title?: string
}>()
</script>

<template>
  <details class="war-section" open>
    <summary class="war-section__head">
      <svg class="war-section__chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M6 9l6 6 6-6" />
      </svg>
      <slot name="title"><h2 class="section-title">{{ title }}</h2></slot>
      <span class="war-section__actions"><slot name="actions" /></span>
    </summary>
    <div class="war-section__body"><slot /></div>
  </details>
</template>

<style scoped>
.war-section {
  padding: var(--space-lg);
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
}

.war-section__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-sm);
  list-style: none;
  cursor: pointer;
}

.war-section__head::-webkit-details-marker {
  display: none;
}

.war-section__chevron {
  flex-shrink: 0;
  color: var(--text-tertiary);
  transform: rotate(-90deg);
  transition: transform 150ms ease-out;
}

.war-section[open] > .war-section__head .war-section__chevron {
  transform: none;
}

.war-section__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs);
  margin-left: auto;
}

.war-section__body {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  margin-top: var(--space-sm);
}

@media (prefers-reduced-motion: reduce) {
  .war-section__chevron {
    transition: none;
  }
}
</style>
