<script setup lang="ts">
import ProviderIcon from '@/components/domain/ProviderIcon.vue'
import type { OAuthProvider } from '@/types/api/player-auth'

defineProps<{
  provider: OAuthProvider
  variant?: 'primary' | 'chip'
}>()
</script>

<template>
  <span v-if="variant === 'chip'" class="provider provider--chip" :data-provider="provider">
    <ProviderIcon :provider="provider" :size="20" />
  </span>
  <button v-else type="button" class="provider" :class="{ 'provider--primary': variant === 'primary' }"
    :data-provider="provider">
    <span class="provider__icon" aria-hidden="true">
      <ProviderIcon :provider="provider" :size="variant === 'primary' ? 20 : 18" />
    </span>
    <span><slot /></span>
  </button>
</template>

<style scoped>
.provider[data-provider="discord"] {
  --provider-accent: #5865f2;
}

.provider[data-provider="beatleader"] {
  --provider-accent: #a855f7;
}

.provider[data-provider="steam"] {
  --provider-accent: #4b6a8c;
}

[data-theme="light"] .provider[data-provider="steam"] {
  --provider-accent: #1b2838;
}

button.provider {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  height: 44px;
  padding: 0 var(--space-md);
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-btn);
  color: var(--text-primary);
  font-family: var(--font-sans);
  font-size: var(--text-body);
  font-weight: 500;
  cursor: pointer;
  transition: border-color 120ms ease, background 120ms ease, color 120ms ease;
}

button.provider:hover {
  border-color: var(--provider-accent);
  background: color-mix(in srgb, var(--provider-accent) 10%, var(--bg-surface));
}

.provider__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--provider-accent);
}

button.provider--primary {
  height: 48px;
  background: var(--provider-accent);
  border-color: var(--provider-accent);
  color: #ffffff;
  font-weight: 600;
}

button.provider--primary:hover {
  background: color-mix(in srgb, var(--provider-accent) 88%, #000 12%);
  border-color: color-mix(in srgb, var(--provider-accent) 88%, #000 12%);
}

.provider--primary .provider__icon {
  color: #ffffff;
}

.provider--chip {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border-radius: var(--radius-btn);
  background: color-mix(in srgb, var(--provider-accent) 18%, transparent);
  color: var(--provider-accent);
}
</style>
