<script setup lang="ts">
import { buildOAuthStartUrl, getDefaultCallbackUrl } from '@/api/auth'
import { parseApiError } from '@/api/client'
import ProviderButton from '@/components/domain/ProviderButton.vue'
import { useAuthStore } from '@/stores/auth'
import type { AuthMeResponse } from '@/types/api/player-auth'
import type { OAuthProvider } from '@/types/api/player-auth'
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'

const props = defineProps<{
  me: AuthMeResponse
}>()

const authStore = useAuthStore()
const route = useRoute()

const providerLabels: Record<OAuthProvider, string> = {
  discord: 'Discord',
  beatleader: 'BeatLeader',
  steam: 'Steam',
}

const allProviders: OAuthProvider[] = ['discord', 'beatleader', 'steam']

const availableLinkProviders = computed<OAuthProvider[]>(() =>
  allProviders.filter((p) => !props.me.connections.some((c) => c.provider === p)),
)

const connectionError = ref('')

function startLogin(provider: OAuthProvider) {
  connectionError.value = ''
  sessionStorage.setItem('authRedirectTo', route.fullPath)
  window.location.href = buildOAuthStartUrl(provider, getDefaultCallbackUrl())
}

async function disconnect(provider: OAuthProvider) {
  connectionError.value = ''
  try {
    await authStore.removeConnection(provider)
  } catch (e) {
    const msg = parseApiError(e, 'Could not remove connection').message
    connectionError.value = msg.includes('last') ? 'You must keep at least one linked account.' : msg
  }
}
</script>

<template>
  <section class="settings-card">
    <header class="settings-card__header">
      <h2 class="settings-card__title">Linked accounts</h2>
    </header>

    <ul class="connections">
      <li v-for="c in me.connections" :key="c.provider" class="connection">
        <ProviderButton :provider="c.provider" variant="chip" />
        <div class="connection__info">
          <span class="connection__provider">{{ providerLabels[c.provider] }}</span>
          <span v-if="c.providerUsername" class="connection__username">
            {{ c.providerUsername }}
          </span>
        </div>
        <button class="connection__remove" :disabled="me.connections.length <= 1" @click="disconnect(c.provider)">
          Remove
        </button>
      </li>
    </ul>

    <p v-if="connectionError" class="settings-card__error">{{ connectionError }}</p>
  </section>

  <section v-if="availableLinkProviders.length" class="settings-card">
    <header class="settings-card__header">
      <h2 class="settings-card__title">Link another account</h2>
    </header>

    <div class="provider-grid">
      <ProviderButton v-for="provider in availableLinkProviders" :key="provider" :provider="provider"
        :aria-label="`Continue with ${providerLabels[provider]}`" @click="startLogin(provider)">
        {{ providerLabels[provider] }}
      </ProviderButton>
    </div>
  </section>
</template>

<style scoped>
.connections {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.connection {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md);
  background: var(--bg-base);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-btn);
}

.connection__info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.connection__provider {
  font-size: var(--text-body);
  font-weight: 500;
  color: var(--text-primary);
}

.connection__username {
  font-size: var(--text-caption);
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.connection__remove {
  background: none;
  border: 1px solid transparent;
  color: var(--error);
  font-family: var(--font-sans);
  font-size: var(--text-caption);
  font-weight: 500;
  cursor: pointer;
  padding: var(--space-xs) var(--space-sm);
  border-radius: var(--radius-btn);
  transition: background 120ms ease, border-color 120ms ease;
}

.connection__remove:hover:not(:disabled) {
  background: color-mix(in srgb, var(--error) 12%, transparent);
  border-color: color-mix(in srgb, var(--error) 30%, transparent);
}

.connection__remove:disabled {
  color: var(--text-tertiary);
  cursor: not-allowed;
}

.provider-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: var(--space-sm);
}
</style>
