<script setup lang="ts">
import { buildOAuthStartUrl, getDefaultCallbackUrl } from '@/api/auth'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import ProviderIcon from '@/components/domain/ProviderIcon.vue'
import { useAuthStore } from '@/stores/auth'
import type { OAuthProvider } from '@/types/api/player-auth'
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()

const isLoggedIn = computed(() => authStore.isLoggedIn)
const me = computed(() => authStore.authMe)

const providerLabels: Record<OAuthProvider, string> = {
  discord: 'Discord',
  beatleader: 'BeatLeader',
  steam: 'Steam',
}

const secondaryProviders: OAuthProvider[] = ['beatleader', 'steam']

function startLogin(provider: OAuthProvider) {
  sessionStorage.setItem('authRedirectTo', route.fullPath)
  window.location.href = buildOAuthStartUrl(provider, getDefaultCallbackUrl())
}

async function handleLogout() {
  await authStore.logout()
  emit('close')
}

function goToSettings() {
  emit('close')
  router.push({ name: 'settings' })
}
</script>

<template>
  <BaseModal :open="open" title="Log In" max-width="420px" @close="emit('close')">
    <div class="auth-modal">
      <template v-if="isLoggedIn && me">
        <div class="auth-modal__profile">
          <img v-if="me.avatarUrl" :src="me.avatarUrl" :alt="me.name" class="auth-modal__avatar" />
          <div class="auth-modal__profile-text">
            <span class="auth-modal__name">{{ me.name }}</span>
            <span v-if="me.country" class="auth-modal__country">{{ me.country }}</span>
          </div>
        </div>

        <p class="auth-modal__hint">
          Manage linked accounts and preferences from your settings.
        </p>

        <div class="auth-modal__actions">
          <BaseButton variant="primary" @click="goToSettings">Open Settings</BaseButton>
          <BaseButton variant="destructive" @click="handleLogout">Log Out</BaseButton>
        </div>
      </template>

      <template v-else>
        <p class="auth-modal__intro">
          Log in with any of your linked accounts - We recommend Discord, but you can log in with either Steam or BeatLeader directly.
        </p>

        <button class="provider provider--discord provider--primary" @click="startLogin('discord')">
          <span class="provider__icon" aria-hidden="true">
            <ProviderIcon provider="discord" :size="20" />
          </span>
          <span class="provider__label">Continue with Discord</span>
        </button>

        <div class="auth-modal__divider">
          <span>or</span>
        </div>

        <div class="auth-modal__provider-row">
          <button v-for="provider in secondaryProviders" :key="provider" class="provider" :data-provider="provider"
            @click="startLogin(provider)">
            <span class="provider__icon" aria-hidden="true">
              <ProviderIcon :provider="provider" />
            </span>
            <span class="provider__label">{{ providerLabels[provider] }}</span>
          </button>
        </div>
      </template>
    </div>
  </BaseModal>
</template>

<style scoped>
.auth-modal {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.auth-modal__intro,
.auth-modal__hint {
  color: var(--text-secondary);
  font-size: var(--text-body);
  line-height: 1.55;
  margin: 0;
}

.auth-modal__profile {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md);
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
}

.auth-modal__avatar {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-avatar);
  object-fit: cover;
}

.auth-modal__profile-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.auth-modal__name {
  font-weight: 600;
  color: var(--text-primary);
  font-size: var(--text-body);
}

.auth-modal__country {
  color: var(--text-secondary);
  font-size: var(--text-caption);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.auth-modal__actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.provider {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  height: 44px;
  padding: 0 var(--space-lg);
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

.provider:hover {
  border-color: var(--provider-accent, var(--text-tertiary));
  background: color-mix(in srgb, var(--provider-accent, var(--bg-elevated)) 10%, var(--bg-surface));
}

.provider__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--provider-accent, var(--text-primary));
}

.provider--primary {
  background: var(--provider-accent);
  border-color: var(--provider-accent);
  color: #ffffff;
  font-weight: 600;
  height: 48px;
}

.provider--primary:hover {
  background: color-mix(in srgb, var(--provider-accent) 88%, #000 12%);
  border-color: color-mix(in srgb, var(--provider-accent) 88%, #000 12%);
  color: #ffffff;
}

.provider--primary .provider__icon {
  color: #ffffff;
}

.provider--discord {
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

.auth-modal__provider-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-sm);
}

.auth-modal__provider-row .provider {
  padding: 0 var(--space-md);
}

.auth-modal__divider {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  color: var(--text-tertiary);
  font-size: var(--text-caption);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  margin: var(--space-xs) 0;
}

.auth-modal__divider::before,
.auth-modal__divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--bg-overlay);
}
</style>
