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
  min-height: var(--control-h);
  padding: var(--space-sm);
  text-align: left;
  white-space: normal;
  color: var(--text-secondary);
  background: var(--bg-elevated);
  border: none;
  border-radius: var(--radius-btn);
  cursor: pointer;
  transition: color var(--dur-fast) var(--ease-out);
}

.editor-toggle:hover:not(:disabled) {
  color: var(--text-primary);
}

.editor-toggle:disabled {
  cursor: not-allowed;
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
  font-size: var(--text-body);
  font-weight: 500;
  color: var(--text-primary);
}

.editor-toggle--on .editor-toggle__label {
  color: var(--page-accent);
}

.editor-toggle__state {
  font-size: var(--text-caption);
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
