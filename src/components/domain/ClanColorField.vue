<script setup lang="ts">
import IconButton from '@/components/common/IconButton.vue'

const color = defineModel<string>({ required: true })

defineProps<{
  label: string
  disabled?: boolean
  error?: string
}>()

const neutral = getComputedStyle(document.documentElement).getPropertyValue('--bg-overlay').trim()
</script>

<template>
  <div class="color-field">
    <label class="color-field__row">
      <input
        type="color"
        :value="color || neutral"
        :disabled="disabled"
        @input="color = ($event.target as HTMLInputElement).value.toLowerCase()"
      />
      <span class="field-label">{{ label }}</span>
      <slot />
      <IconButton v-if="color" :label="`Clear ${label}`" :disabled="disabled" @click.prevent="color = ''" />
    </label>
    <p v-if="error" class="caption color-field__error" role="alert">{{ error }}</p>
  </div>
</template>

<style scoped>
.color-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.color-field__row {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  min-height: var(--control-h);
  cursor: pointer;
}

.color-field__row input {
  width: 28px;
  height: 28px;
  padding: 0;
  background: none;
  border: none;
  border-radius: var(--radius-input);
  cursor: pointer;
}

.color-field__error {
  color: var(--error);
}
</style>
