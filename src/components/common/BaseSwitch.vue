<script setup lang="ts">
const checked = defineModel<boolean>({ required: true })

defineProps<{
  label?: string
  disabled?: boolean
}>()
</script>

<template>
  <button
    type="button"
    role="switch"
    class="base-switch"
    :class="{ 'base-switch--on': checked }"
    :aria-checked="checked"
    :disabled="disabled"
    @click="checked = !checked"
  >
    <span class="base-switch__track" aria-hidden="true"><span class="base-switch__thumb" /></span>
    <slot>
      <span v-if="label" class="base-switch__label">{{ label }}</span>
    </slot>
  </button>
</template>

<style scoped>
:where(.base-switch) {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  flex-shrink: 0;
  padding: 0;
  background: none;
  border: none;
  font: inherit;
  white-space: nowrap;
  cursor: pointer;
}

:where(.base-switch):disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.base-switch__track {
  position: relative;
  flex-shrink: 0;
  width: 28px;
  height: 16px;
  border-radius: 8px;
  background: var(--bg-overlay);
  border: 1px solid var(--text-tertiary);
  transition: background 120ms ease, border-color 120ms ease;
}

.base-switch__thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--text-tertiary);
  transition: transform 120ms ease, background 120ms ease;
}

.base-switch--on .base-switch__track {
  background: color-mix(in srgb, var(--page-accent, var(--accent)) 40%, transparent);
  border-color: var(--page-accent, var(--accent));
}

.base-switch--on .base-switch__thumb {
  transform: translateX(12px);
  background: var(--page-accent, var(--accent));
}

.base-switch__label {
  font-size: var(--text-caption);
  color: var(--text-secondary);
  user-select: none;
}

@media (prefers-reduced-motion: reduce) {
  .base-switch__track,
  .base-switch__thumb {
    transition: none;
  }
}
</style>
