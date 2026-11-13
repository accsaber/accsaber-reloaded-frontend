<script setup lang="ts">
defineProps<{
  label: string
  icon?: 'close' | 'back'
}>()
</script>

<template>
  <button type="button" class="icon-button pressable" :aria-label="label">
    <slot>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <polyline v-if="icon === 'back'" points="15 6 9 12 15 18" />
        <path v-else d="M18 6 6 18M6 6l12 12" />
      </svg>
    </slot>
  </button>
</template>

<style scoped>
.icon-button {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  padding: 0;
  color: var(--text-secondary);
  background: transparent;
  border: none;
  border-radius: var(--radius-btn);
  cursor: pointer;
  transition:
    color var(--dur-fast) var(--ease-out),
    background-color var(--dur-fast) var(--ease-out),
    transform var(--dur-fast) var(--ease-out);
}

.icon-button::before {
  content: '';
  position: absolute;
  inset: -8px;
}

.icon-button:hover:not(:disabled) {
  color: var(--text-primary);
  background: var(--bg-overlay);
}

.icon-button:disabled {
  color: var(--text-tertiary);
  cursor: not-allowed;
}
</style>
