<script setup lang="ts">
import BaseSwitch from '@/components/common/BaseSwitch.vue'
import { computed, useSlots } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    label: string
    onText?: string
    offText?: string
    disabled?: boolean
  }>(),
  { onText: '', offText: '', disabled: false },
)

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const slots = useSlots()

const hasGlyph = computed(() => !!slots.glyph)

const stateText = computed(() => (props.modelValue ? props.onText : props.offText))
</script>

<template>
  <BaseSwitch
    class="editor-toggle"
    :class="{ 'editor-toggle--on': modelValue }"
    :model-value="modelValue"
    :disabled="disabled"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <span v-if="hasGlyph" class="editor-toggle__glyph">
      <slot name="glyph" />
    </span>
    <span class="editor-toggle__copy">
      <span class="editor-toggle__label">{{ label }}</span>
      <span v-if="stateText" class="editor-toggle__state">{{ stateText }}</span>
    </span>
  </BaseSwitch>
</template>

<style scoped>
.editor-toggle {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  width: 100%;
  padding: var(--space-sm) 12px;
  text-align: left;
  white-space: normal;
  color: var(--text-secondary);
  background: var(--bg-base);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  cursor: pointer;
  transition:
    color 120ms ease,
    background 120ms ease,
    border-color 120ms ease;
}

.editor-toggle:hover:not(:disabled) {
  color: var(--text-primary);
  background: var(--bg-elevated);
}

.editor-toggle:disabled {
  cursor: not-allowed;
}

.editor-toggle--on,
.editor-toggle--on:hover:not(:disabled) {
  color: var(--page-accent);
  background: color-mix(in srgb, var(--page-accent) 10%, transparent);
  border-color: var(--page-accent);
}

.editor-toggle__glyph {
  display: inline-flex;
  flex-shrink: 0;
}

.editor-toggle__copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1 1 auto;
  min-width: 0;
}

.editor-toggle__label {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  font-family: var(--font-sans);
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--text-primary);
}

.editor-toggle--on .editor-toggle__label {
  color: var(--page-accent);
}

.editor-toggle__state {
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  color: var(--text-secondary);
  line-height: 1.3;
}

.editor-toggle :deep(.base-switch__track) {
  order: 1;
}

@media (prefers-reduced-motion: reduce) {
  .editor-toggle {
    transition: none;
  }
}
</style>
