<script setup lang="ts">
import { buildOAuthStartUrl, getDefaultCallbackUrl } from '@/api/auth'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import ProviderButton from '@/components/domain/ProviderButton.vue'
import { onImageError, pickAvatarFallback, pickAvatarUrl } from '@/utils/media'
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
const me = computed(() => authStore.authMe?.player ?? null)
const meAvatarUrl = computed(() => pickAvatarUrl(me.value))
const meAvatarFallback = computed(() => pickAvatarFallback(me.value))
const handleMeAvatarError = (e: Event) => onImageError(meAvatarFallback.value)(e)

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
          <img v-if="meAvatarUrl" :src="meAvatarUrl" :alt="me.name" class="auth-modal__avatar"
            decoding="async" @error="handleMeAvatarError" />
          <div class="auth-modal__profile-text">
            <span class="auth-modal__name">{{ me.name }}</span>
            <span v-if="me.country" class="field-label">{{ me.country }}</span>
          </div>
        </div>


        <div class="auth-modal__actions">
          <BaseButton variant="primary" @click="goToSettings">Open Settings</BaseButton>
          <BaseButton variant="destructive" @click="handleLogout">Log Out</BaseButton>
        </div>
      </template>

      <template v-else>

        <ProviderButton provider="discord" variant="primary" @click="startLogin('discord')">
          Continue with Discord
        </ProviderButton>

        <div class="auth-modal__divider">
          <span>or</span>
        </div>

        <div class="auth-modal__provider-row">
          <ProviderButton v-for="provider in secondaryProviders" :key="provider" :provider="provider"
            @click="startLogin(provider)">
            {{ providerLabels[provider] }}
          </ProviderButton>
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

.auth-modal__actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.auth-modal__provider-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-sm);
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
