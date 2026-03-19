<script setup lang="ts">
defineProps<{
  modelValue: string | number
  label?: string
  type?: string
  placeholder?: string
  error?: string
  disabled?: boolean
}>()

defineEmits<{
  'update:modelValue': [value: string | number]
}>()
</script>

<template>
  <div class="base-input" :class="{ 'base-input--error': error, 'base-input--disabled': disabled }">
    <label v-if="label" class="base-input__label">{{ label }}</label>
    <input class="base-input__field" :type="type ?? 'text'" :value="modelValue" :placeholder="placeholder"
      :disabled="disabled" @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)" />
    <span v-if="error" class="base-input__error">{{ error }}</span>
  </div>
</template>

<style scoped>
.base-input {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.base-input__label {
  font-size: var(--text-caption);
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 500;
}

.base-input__field {
  padding: var(--space-sm) var(--space-md);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-input);
  background: var(--bg-base);
  color: var(--text-primary);
  font-family: var(--font-sans);
  font-size: var(--text-body);
  transition: border-color 120ms ease-in, box-shadow 120ms ease-in;
  outline: none;
}

.base-input__field::placeholder {
  color: var(--text-tertiary);
}

.base-input__field:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 20%, transparent);
}

.base-input--error .base-input__field {
  border-color: var(--error);
}

.base-input--error .base-input__field:focus {
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--error) 20%, transparent);
}

.base-input__error {
  font-size: var(--text-caption);
  color: var(--error);
}

.base-input--disabled .base-input__field {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
