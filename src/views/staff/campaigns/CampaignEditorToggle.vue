<script setup lang="ts">
import CampaignFieldHint from './CampaignFieldHint.vue'
import { computed, useSlots } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    label: string
    onText?: string
    offText?: string
    hint?: string
    disabled?: boolean
  }>(),
  { onText: '', offText: '', hint: '', disabled: false },
)

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const slots = useSlots()

const hasGlyph = computed(() => !!slots.glyph)

const stateText = computed(() => (props.modelValue ? props.onText : props.offText))
</script>

<template>
  <button
    type="button"
    role="switch"
    class="editor-toggle"
    :class="{ 'editor-toggle--on': modelValue }"
    :aria-checked="modelValue"
    :disabled="disabled"
    @click="emit('update:modelValue', !modelValue)"
  >
    <span v-if="hasGlyph" class="editor-toggle__glyph">
      <slot name="glyph" />
    </span>
    <span class="editor-toggle__copy">
      <span class="editor-toggle__label">
        {{ label }}
        <CampaignFieldHint v-if="hint" :text="hint" />
      </span>
      <span v-if="stateText" class="editor-toggle__state">{{ stateText }}</span>
    </span>
    <span class="editor-toggle__track" aria-hidden="true">
      <span class="editor-toggle__knob" />
    </span>
  </button>
</template>

<style scoped>
.editor-toggle {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  width: 100%;
  padding: var(--space-sm) 12px;
  text-align: left;
  color: var(--text-secondary);
  background: var(--bg-base);
  border: 1px solid var(--bg-overlay);
  border-radius: 4px;
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
  opacity: 0.55;
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
  gap: 4px;
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

.editor-toggle__track {
  flex-shrink: 0;
  width: 34px;
  height: 18px;
  padding: 2px;
  background: var(--bg-overlay);
  border-radius: 3px;
  transition: background 120ms ease;
}

.editor-toggle--on .editor-toggle__track {
  background: color-mix(in srgb, var(--page-accent) 35%, transparent);
}

.editor-toggle__knob {
  display: block;
  width: 14px;
  height: 14px;
  background: var(--text-tertiary);
  border-radius: 2px;
  transition:
    transform 150ms ease,
    background 120ms ease;
}

.editor-toggle--on .editor-toggle__knob {
  background: var(--page-accent);
  transform: translateX(16px);
}

@media (prefers-reduced-motion: reduce) {
  .editor-toggle,
  .editor-toggle__track,
  .editor-toggle__knob {
    transition: none;
  }
}
</style>
