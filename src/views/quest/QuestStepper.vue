<script setup lang="ts">
const props = defineProps<{
  steps: string[]
  current: number
  unlocked: number
}>()

defineEmits<{
  select: [step: number]
}>()

function stateOf(index: number): string {
  if (index === props.current) return 'active'
  if (index < props.current) return 'done'
  if (index <= props.unlocked) return 'ahead'
  return 'locked'
}
</script>

<template>
  <ol class="stepper">
    <li v-for="(label, index) in steps" :key="label" class="stepper__step"
      :class="`stepper__step--${stateOf(index)}`">
      <button type="button" class="stepper__button" :disabled="index > unlocked"
        :aria-current="index === current ? 'step' : undefined" @click="$emit('select', index)">
        <span class="stepper__marker">
          <svg v-if="index < current" width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
            aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <template v-else>{{ index + 1 }}</template>
        </span>
        <span class="stepper__label">{{ label }}</span>
      </button>
      <span v-if="index < steps.length - 1" class="stepper__line" aria-hidden="true" />
    </li>
  </ol>
</template>

<style scoped>
.stepper {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  list-style: none;
  margin: 0 0 var(--space-xl);
  padding: 0;
}

.stepper__step {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex: 1;
  min-width: 0;
}

.stepper__button {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  min-width: 0;
  padding: var(--space-xs) var(--space-sm);
  background: none;
  border: none;
  border-radius: var(--radius-btn);
  color: var(--text-tertiary);
  font-family: var(--font-sans);
  font-size: var(--text-body);
  font-weight: 500;
  text-align: left;
  cursor: pointer;
  transition: color 120ms ease, background 120ms ease;
}

.stepper__button:disabled {
  cursor: not-allowed;
}

.stepper__button:hover:not(:disabled) {
  background: var(--bg-elevated);
}

.stepper__marker {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 26px;
  height: 26px;
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-avatar);
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  font-weight: 600;
  transition: border-color 120ms ease, color 120ms ease, background 120ms ease;
}

.stepper__label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stepper__line {
  flex: 1;
  height: 1px;
  min-width: var(--space-sm);
  background: var(--bg-overlay);
}

.stepper__step--active .stepper__button {
  color: var(--text-primary);
  font-weight: 600;
}

.stepper__step--active .stepper__marker {
  border-color: var(--page-accent, var(--accent));
  color: var(--page-accent, var(--accent));
}

.stepper__step--done .stepper__button {
  color: var(--text-secondary);
}

.stepper__step--done .stepper__marker {
  border-color: var(--page-accent, var(--accent));
  background: color-mix(in srgb, var(--page-accent, var(--accent)) 12%, transparent);
  color: var(--page-accent, var(--accent));
}

.stepper__step--ahead .stepper__button {
  color: var(--text-secondary);
}

@media (max-width: 767px) {
  .stepper {
    gap: var(--space-xs);
  }

  .stepper__label {
    display: none;
  }

  .stepper__step--active .stepper__label {
    display: block;
  }
}

@media (prefers-reduced-motion: reduce) {
  .stepper__button,
  .stepper__marker {
    transition: none;
  }
}
</style>
