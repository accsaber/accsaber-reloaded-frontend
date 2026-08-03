<script setup lang="ts">
export interface WikiFlowStep {
  label: string
  detail?: string
  accent?: string
}

defineProps<{
  steps: WikiFlowStep[]
}>()
</script>

<template>
  <div class="wiki-flow" role="list">
    <template v-for="(step, index) in steps" :key="index">
      <svg
        v-if="index"
        class="wiki-flow__arrow"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <line x1="5" y1="12" x2="19" y2="12" />
        <polyline points="12 5 19 12 12 19" />
      </svg>
      <div class="wiki-flow__step" role="listitem">
        <span class="wiki-flow__label" :style="step.accent ? { color: step.accent } : undefined">
          {{ step.label }}
        </span>
        <span v-if="step.detail" class="wiki-flow__detail">{{ step.detail }}</span>
      </div>
    </template>
  </div>
</template>

<style scoped>
.wiki-flow {
  display: flex;
  align-items: stretch;
  gap: var(--space-sm);
  margin: 0 0 var(--space-md);
}

.wiki-flow__step {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--space-md);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  background: var(--bg-surface);
}

.wiki-flow__label {
  font-size: var(--text-body);
  font-weight: 600;
  color: var(--text-primary);
}

.wiki-flow__detail {
  font-size: var(--text-caption);
  color: var(--text-secondary);
  line-height: 1.5;
}

.wiki-flow__arrow {
  flex-shrink: 0;
  align-self: center;
  color: var(--text-tertiary);
}

@media (max-width: 639px) {
  .wiki-flow {
    flex-direction: column;
    align-items: stretch;
  }

  .wiki-flow__arrow {
    transform: rotate(90deg);
  }
}
</style>
