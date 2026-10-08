<script setup lang="ts">
defineOptions({ inheritAttrs: false })

defineProps<{
  modelValue: string
  label?: string
  placeholder?: string
  error?: string
  disabled?: boolean
  maxlength?: number
  rows?: number
}>()

defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<template>
  <div class="base-textarea" :class="{ 'base-textarea--error': error }">
    <label v-if="label" class="base-textarea__label">{{ label }}</label>
    <textarea
      class="base-textarea__field"
      v-bind="$attrs"
      :value="modelValue"
      :rows="rows ?? 4"
      :maxlength="maxlength"
      :placeholder="placeholder"
      :disabled="disabled"
      @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
    />
    <div class="base-textarea__foot">
      <span v-if="error" class="base-textarea__error">{{ error }}</span>
      <span v-if="maxlength" class="base-textarea__counter">{{ modelValue.length }}/{{ maxlength }}</span>
    </div>
  </div>
</template>

<style scoped>
.base-textarea {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.base-textarea__label {
  font-size: var(--text-caption);
  font-weight: 500;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--text-secondary);
}

.base-textarea__field {
  width: 100%;
  min-height: 88px;
  padding: var(--space-sm);
  background: var(--bg-base);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-input);
  color: var(--text-primary);
  font-family: var(--font-sans);
  font-size: var(--text-body);
  line-height: 1.5;
  resize: vertical;
}

.base-textarea__field::placeholder {
  color: var(--text-tertiary);
}

.base-textarea__field:focus {
  outline: none;
  border-color: var(--page-accent, var(--accent));
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--page-accent, var(--accent)) 20%, transparent);
}

.base-textarea--error .base-textarea__field {
  border-color: var(--error);
}

.base-textarea__foot {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-sm);
}

.base-textarea__error {
  font-size: var(--text-caption);
  color: var(--error);
}

.base-textarea__counter {
  margin-left: auto;
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--text-tertiary);
}
</style>
