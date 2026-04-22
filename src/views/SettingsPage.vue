<script setup lang="ts">
import { buildOAuthStartUrl, getDefaultCallbackUrl } from '@/api/auth'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import PageHeaderBleed from '@/components/common/PageHeaderBleed.vue'
import ProviderIcon from '@/components/domain/ProviderIcon.vue'
import PseudoLoginModal from '@/components/domain/PseudoLoginModal.vue'
import { usePageMeta } from '@/composables/usePageMeta'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import type { OAuthProvider } from '@/types/api/player-auth'
import { isRankingSubdomain } from '@/utils/subdomain'
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'

usePageMeta({
  title: 'Settings | AccSaber Reloaded',
  description: 'Manage appearance, account, and linked accounts.',
})

type SectionKey = 'appearance' | 'account' | 'connections'

interface SectionDef {
  key: SectionKey
  label: string
  requiresLogin: boolean
}

const authStore = useAuthStore()
const themeStore = useThemeStore()
const route = useRoute()

const me = computed(() => authStore.authMe)
const isLoggedIn = computed(() => authStore.isLoggedIn)
const canAccessAccount = computed(
  () => isLoggedIn.value || (isRankingSubdomain && authStore.isStaffAuthorized),
)
const canAccessConnections = computed(() => isLoggedIn.value)

const activeSection = ref<SectionKey>('appearance')
const connectionError = ref('')
const logoutConfirm = ref(false)
const loginModalOpen = ref(false)

const sections = computed<SectionDef[]>(() => [
  { key: 'appearance', label: 'Appearance', requiresLogin: false },
  { key: 'account', label: 'Account', requiresLogin: !canAccessAccount.value },
  { key: 'connections', label: 'Connections', requiresLogin: !canAccessConnections.value },
])

const providerLabels: Record<OAuthProvider, string> = {
  discord: 'Discord',
  beatleader: 'BeatLeader',
  steam: 'Steam',
}

const allProviders: OAuthProvider[] = ['discord', 'beatleader', 'steam']

const availableLinkProviders = computed<OAuthProvider[]>(() =>
  allProviders.filter((p) => !me.value?.connections.some((c) => c.provider === p)),
)

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
    const msg = e instanceof Error ? e.message : 'Could not remove connection'
    connectionError.value = msg.includes('last') ? 'You must keep at least one linked account.' : msg
  }
}

async function confirmLogout() {
  logoutConfirm.value = false
  if (isRankingSubdomain) {
    await Promise.all([authStore.staffLogout(), authStore.logout()])
  } else {
    await authStore.logout()
  }
  activeSection.value = 'appearance'
}

function selectSection(section: SectionDef) {
  if (section.requiresLogin && !isLoggedIn.value) {
    loginModalOpen.value = true
    return
  }
  activeSection.value = section.key
}
</script>

<template>
  <div class="settings" :style="{ '--page-accent': 'var(--accent-overall)' }">
    <PageHeaderBleed title="Settings" subtitle="Preferences and linked accounts" />

    <div class="settings__layout">
      <nav class="settings__nav" aria-label="Settings sections">
        <button v-for="section in sections" :key="section.key" type="button" class="settings__nav-btn" :class="{
          'settings__nav-btn--active': activeSection === section.key,
          'settings__nav-btn--locked': section.requiresLogin,
        }" @click="selectSection(section)">
          <span class="settings__nav-label">{{ section.label }}</span>
          <svg v-if="section.requiresLogin" class="settings__nav-lock" width="14" height="14"
            viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
            stroke-linejoin="round" aria-label="Locked">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </button>
      </nav>

      <main class="settings__main">
        <template v-if="activeSection === 'appearance'">
          <section class="settings-card">
            <header class="settings-card__header">
              <h2 class="settings-card__title">Theme</h2>
              <p class="settings-card__desc">Available without signing in. Stored on this device.</p>
            </header>

            <div class="settings-row">
              <div class="settings-row__label">
                <span class="settings-row__title">Color mode</span>
                <span class="settings-row__hint">Match the brightness of your environment.</span>
              </div>
              <div class="theme-picker" role="radiogroup" aria-label="Color mode">
                <button type="button" class="theme-picker__btn"
                  :class="{ 'theme-picker__btn--active': themeStore.theme === 'dark' }" role="radio"
                  :aria-checked="themeStore.theme === 'dark'"
                  @click="themeStore.theme === 'light' && themeStore.toggle()">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                    stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                  </svg>
                  <span>Dark</span>
                </button>
                <button type="button" class="theme-picker__btn"
                  :class="{ 'theme-picker__btn--active': themeStore.theme === 'light' }" role="radio"
                  :aria-checked="themeStore.theme === 'light'"
                  @click="themeStore.theme === 'dark' && themeStore.toggle()">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                    stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="5" />
                    <line x1="12" y1="1" x2="12" y2="3" />
                    <line x1="12" y1="21" x2="12" y2="23" />
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                    <line x1="1" y1="12" x2="3" y2="12" />
                    <line x1="21" y1="12" x2="23" y2="12" />
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                  </svg>
                  <span>Light</span>
                </button>
              </div>
            </div>
          </section>

          <section v-if="!canAccessAccount" class="settings-card settings-card--gated">
            <header class="settings-card__header">
              <h2 class="settings-card__title">More options locked</h2>
              <p class="settings-card__desc">
                Sign in to manage your account and linked accounts.
              </p>
            </header>
            <BaseButton variant="primary" @click="loginModalOpen = true">Sign in</BaseButton>
          </section>
        </template>

        <template v-else-if="activeSection === 'account' && canAccessAccount">
          <section class="settings-card">
            <header class="settings-card__header">
              <h2 class="settings-card__title">Account</h2>
              <p class="settings-card__desc">Your public profile across AccSaber.</p>
            </header>

            <div v-if="me" class="settings-profile">
              <img v-if="me.avatarUrl" :src="me.avatarUrl" :alt="me.name" class="settings-profile__avatar" />
              <div class="settings-profile__text">
                <span class="settings-profile__name">{{ me.name }}</span>
                <span v-if="me.country" class="settings-profile__country">{{ me.country }}</span>
              </div>
            </div>

            <div class="settings-row settings-row--danger">
              <div class="settings-row__label">
                <span class="settings-row__title">Sign out</span>
                <span class="settings-row__hint">
                  {{ isRankingSubdomain
                    ? 'Signs you out of ranking and across AccSaber.'
                    : 'Clears your session on this device.' }}
                </span>
              </div>
              <BaseButton variant="destructive" @click="logoutConfirm = true">Log out</BaseButton>
            </div>
          </section>
        </template>

        <template v-else-if="activeSection === 'connections' && canAccessConnections && me">
          <section class="settings-card">
            <header class="settings-card__header">
              <h2 class="settings-card__title">Linked accounts</h2>
              <p class="settings-card__desc">
                Keep at least one linked account so you can sign back in.
              </p>
            </header>

            <ul class="connections">
              <li v-for="c in me.connections" :key="c.provider" class="connection" :data-provider="c.provider">
                <span class="connection__icon" :data-provider="c.provider">
                  <ProviderIcon :provider="c.provider" :size="20" />
                </span>
                <div class="connection__info">
                  <span class="connection__provider">{{ providerLabels[c.provider] }}</span>
                  <span v-if="c.providerUsername" class="connection__username">
                    {{ c.providerUsername }}
                  </span>
                </div>
                <button class="connection__remove" :disabled="me.connections.length <= 1"
                  @click="disconnect(c.provider)">
                  Remove
                </button>
              </li>
            </ul>

            <p v-if="connectionError" class="settings-card__error">{{ connectionError }}</p>
          </section>

          <section v-if="availableLinkProviders.length" class="settings-card">
            <header class="settings-card__header">
              <h2 class="settings-card__title">Link another account</h2>
              <p class="settings-card__desc">Connect additional sign-in methods for easier access.</p>
            </header>

            <div class="provider-grid">
              <button v-for="provider in availableLinkProviders" :key="provider" class="provider"
                :data-provider="provider" :aria-label="`Continue with ${providerLabels[provider]}`"
                @click="startLogin(provider)">
                <span class="provider__icon" aria-hidden="true">
                  <ProviderIcon :provider="provider" />
                </span>
                <span class="provider__label">{{ providerLabels[provider] }}</span>
              </button>
            </div>
          </section>
        </template>
      </main>
    </div>

    <BaseModal :open="logoutConfirm" title="Log Out" max-width="340px" @close="logoutConfirm = false">
      <p class="settings__confirm-msg">Are you sure you want to log out?</p>
      <template #footer>
        <div class="settings__confirm-actions">
          <BaseButton @click="logoutConfirm = false">Cancel</BaseButton>
          <BaseButton variant="destructive" @click="confirmLogout">Log Out</BaseButton>
        </div>
      </template>
    </BaseModal>

    <PseudoLoginModal :open="loginModalOpen" @close="loginModalOpen = false" />
  </div>
</template>

<style scoped>
.settings {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  max-width: 1070px;
  margin: 0 auto;
  width: 100%;
}

.settings__layout {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: var(--space-xl);
  align-items: start;
}

.settings__nav {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  position: sticky;
  top: calc(var(--navbar-height) + var(--space-md));
}

.settings__nav-btn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
  width: 100%;
  height: 40px;
  padding: 0 var(--space-md);
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-btn);
  color: var(--text-secondary);
  font-family: var(--font-sans);
  font-size: var(--text-body);
  font-weight: 500;
  cursor: pointer;
  text-align: left;
  transition: color 120ms ease, background 120ms ease, border-color 120ms ease;
}

.settings__nav-btn:hover {
  color: var(--text-primary);
  background: var(--bg-elevated);
}

.settings__nav-btn--active {
  color: var(--page-accent);
  background: color-mix(in srgb, var(--page-accent) 8%, var(--bg-surface));
  border-color: color-mix(in srgb, var(--page-accent) 40%, transparent);
}

.settings__nav-btn--locked .settings__nav-label {
  color: var(--text-tertiary);
}

.settings__nav-btn--locked:hover .settings__nav-label {
  color: var(--text-secondary);
}

.settings__nav-lock {
  color: var(--text-tertiary);
  flex-shrink: 0;
}

.settings__main {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  min-width: 0;
}

.settings-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  padding: var(--space-lg);
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
}

.settings-card--gated {
  background: color-mix(in srgb, var(--page-accent) 4%, var(--bg-surface));
  border-color: color-mix(in srgb, var(--page-accent) 30%, transparent);
  align-items: flex-start;
}

.settings-card__header {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.settings-card__title {
  margin: 0;
  font-size: var(--text-section-heading);
  font-weight: 600;
  color: var(--text-primary);
}

.settings-card__desc {
  margin: 0;
  color: var(--text-secondary);
  font-size: var(--text-body);
  line-height: 1.5;
}

.settings-card__error {
  margin: 0;
  color: var(--error);
  font-size: var(--text-caption);
}

.settings-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
  padding: var(--space-md) 0;
  border-top: 1px solid var(--bg-overlay);
}

.settings-row__label {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.settings-row__title {
  color: var(--text-primary);
  font-size: var(--text-body);
  font-weight: 500;
}

.settings-row__hint {
  color: var(--text-secondary);
  font-size: var(--text-caption);
}

.theme-picker {
  display: inline-flex;
  padding: 3px;
  background: var(--bg-base);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-btn);
  gap: 2px;
}

.theme-picker__btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-xs) var(--space-md);
  background: transparent;
  border: none;
  border-radius: 3px;
  color: var(--text-secondary);
  font-family: var(--font-sans);
  font-size: var(--text-caption);
  font-weight: 500;
  cursor: pointer;
  transition: color 120ms ease, background 120ms ease;
}

.theme-picker__btn:hover {
  color: var(--text-primary);
}

.theme-picker__btn--active {
  color: var(--page-accent);
  background: color-mix(in srgb, var(--page-accent) 10%, var(--bg-surface));
}

.settings-profile {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md);
  background: var(--bg-base);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
}

.settings-profile__avatar {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-avatar);
  object-fit: cover;
}

.settings-profile__text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.settings-profile__name {
  font-weight: 600;
  color: var(--text-primary);
  font-size: var(--text-body);
}

.settings-profile__country {
  color: var(--text-secondary);
  font-size: var(--text-caption);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

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

.connection__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: var(--radius-btn);
  flex-shrink: 0;
}

.connection[data-provider="discord"] .connection__icon {
  background: color-mix(in srgb, #5865f2 18%, transparent);
  color: #5865f2;
}

.connection[data-provider="beatleader"] .connection__icon {
  background: color-mix(in srgb, #a855f7 18%, transparent);
  color: #a855f7;
}

.connection[data-provider="steam"] .connection__icon {
  background: color-mix(in srgb, #1b2838 30%, transparent);
  color: var(--text-primary);
}

[data-theme="light"] .connection[data-provider="steam"] .connection__icon {
  background: color-mix(in srgb, #1b2838 14%, transparent);
  color: #1b2838;
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

.provider:hover {
  color: var(--provider-accent);
  border-color: var(--provider-accent);
  background: color-mix(in srgb, var(--provider-accent) 10%, var(--bg-surface));
}

.provider__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--provider-accent);
}

.settings__confirm-msg {
  color: var(--text-secondary);
  font-size: var(--text-body);
  margin: 0 0 var(--space-md);
  line-height: 1.5;
}

.settings__confirm-actions {
  display: flex;
  gap: var(--space-sm);
  justify-content: flex-end;
}

@media (max-width: 767px) {
  .settings__layout {
    grid-template-columns: 1fr;
    gap: var(--space-md);
  }

  .settings__nav {
    position: static;
    flex-direction: row;
    overflow-x: auto;
    padding-bottom: var(--space-xs);
  }

  .settings__nav-btn {
    flex-shrink: 0;
    width: auto;
  }

  .settings-card {
    padding: var(--space-md);
  }

  .settings-row {
    flex-direction: column;
    align-items: stretch;
    gap: var(--space-sm);
  }
}
</style>
