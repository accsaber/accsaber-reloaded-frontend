<script setup lang="ts">
import { buildOAuthStartUrl, getDefaultCallbackUrl } from '@/api/auth'
import { equipItem, getItems, getUserItems } from '@/api/items'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import PageHeaderBleed from '@/components/common/PageHeaderBleed.vue'
import ProviderIcon from '@/components/domain/ProviderIcon.vue'
import PseudoLoginModal from '@/components/domain/PseudoLoginModal.vue'
import { useNameSyncSetting } from '@/composables/useNameSyncSetting'
import { usePageMeta } from '@/composables/usePageMeta'
import { useAuthStore } from '@/stores/auth'
import { useItemTypeStore } from '@/stores/itemTypes'
import { useSettingsStore } from '@/stores/settings'
import { useThemeStore } from '@/stores/theme'
import type { ItemResponse, UserItemResponse } from '@/types/api/items'
import { filterThemableTokens, readThemeValue } from '@/utils/items'
import type { OAuthProvider } from '@/types/api/player-auth'
import type { PrivacySettings, Visibility } from '@/types/api/settings'
import { isRankingSubdomain } from '@/utils/subdomain'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

usePageMeta({
  title: 'Settings | AccSaber Reloaded',
  description: 'Manage appearance, account, and linked accounts.',
})

type SectionKey = 'appearance' | 'privacy' | 'account' | 'connections'

interface SectionDef {
  key: SectionKey
  label: string
  requiresLogin: boolean
}

const authStore = useAuthStore()
const settingsStore = useSettingsStore()
const themeStore = useThemeStore()
const itemTypeStore = useItemTypeStore()
const route = useRoute()

interface ThemeCard {
  id: string
  themeKey: string
  name: string
  description: string | null
  requirement: string | null
  builtin: boolean
  owned: boolean
  itemId: string | null
  tokens: Record<string, string> | null
}

const BUILTIN_THEMES: ThemeCard[] = [
  { id: 'builtin-dark', themeKey: 'dark', name: 'Dark', description: 'Default dark mode.', requirement: null, builtin: true, owned: true, itemId: null, tokens: null },
  { id: 'builtin-light', themeKey: 'light', name: 'Light', description: 'Default light mode.', requirement: null, builtin: true, owned: true, itemId: null, tokens: null },
]

const BUILTIN_PREVIEW_TOKENS: Record<string, Record<string, string>> = {
  dark: { 'bg-base': '#08080d', 'bg-surface': '#11111c', 'bg-elevated': '#1a1929', 'accent': '#a855f7' },
  light: { 'bg-base': '#f3f2f7', 'bg-surface': '#fdfcff', 'bg-elevated': '#ebe9f1', 'accent': '#a855f7' },
}

function previewVars(card: ThemeCard): Record<string, string> {
  const tokens = card.builtin ? BUILTIN_PREVIEW_TOKENS[card.themeKey] : (card.tokens ? filterThemableTokens(card.tokens) : {})
  const out: Record<string, string> = {}
  if (tokens['bg-base']) out['--preview-base'] = tokens['bg-base']
  if (tokens['bg-surface']) out['--preview-surface'] = tokens['bg-surface']
  if (tokens['bg-elevated']) out['--preview-elevated'] = tokens['bg-elevated']
  const accent = tokens['accent'] ?? tokens['accent-overall']
  if (accent) out['--preview-accent'] = accent
  return out
}

function lockedHint(card: ThemeCard): string {
  if (card.requirement) return card.requirement
  if (card.description) return card.description
  return 'Locked theme.'
}

const themeCatalog = ref<ItemResponse[]>([])
const ownedThemes = ref<UserItemResponse[]>([])
const themeBusy = ref<string | null>(null)

const ownedThemeItemIds = computed(() => new Set(ownedThemes.value.map((u) => u.item.id)))
const ownedThemeLinkByItemId = computed(() => {
  const map = new Map<string, string>()
  for (const u of ownedThemes.value) map.set(u.item.id, u.linkId)
  return map
})

const inventoryThemeCards = computed<ThemeCard[]>(() =>
  themeCatalog.value
    .filter((i) => i.active && !i.deprecated)
    .map((i) => {
      const themeValue = readThemeValue(i.value)
      return {
        id: i.id,
        themeKey: `item:${i.id}`,
        name: i.name,
        description: i.description,
        requirement: i.requirement,
        builtin: false,
        owned: ownedThemeItemIds.value.has(i.id),
        itemId: i.id,
        tokens: themeValue?.tokens ?? null,
      }
    })
    .filter((c) => c.tokens != null),
)

const BUILTIN_NAMES = new Set(BUILTIN_THEMES.map((t) => t.name.toLowerCase()))

const themeCards = computed<ThemeCard[]>(() => {
  const ownedBuiltinByName = new Map<string, ThemeCard>()
  const extras: ThemeCard[] = []
  for (const card of inventoryThemeCards.value) {
    const nameLower = card.name.toLowerCase()
    if (BUILTIN_NAMES.has(nameLower)) {
      if (card.owned) ownedBuiltinByName.set(nameLower, card)
    } else {
      extras.push(card)
    }
  }
  const builtins = BUILTIN_THEMES.map((b) => ownedBuiltinByName.get(b.name.toLowerCase()) ?? b)
  return [...builtins, ...extras]
})

async function loadThemes() {
  await itemTypeStore.fetchItemTypes()
  const themeTypeId = itemTypeStore.byKey.get('theme')?.id
  if (!themeTypeId) {
    themeCatalog.value = []
    return
  }
  try {
    themeCatalog.value = await getItems({ typeId: themeTypeId })
  } catch {
    themeCatalog.value = []
  }

  if (!authStore.userId) {
    ownedThemes.value = []
    return
  }
  try {
    ownedThemes.value = await getUserItems(authStore.userId, { typeKey: 'theme' })
  } catch {
    ownedThemes.value = []
  }
}

async function pickTheme(card: ThemeCard) {
  if (!card.owned || themeBusy.value) return
  themeBusy.value = card.id
  try {
    if (!card.builtin && card.itemId) {
      const linkId = ownedThemeLinkByItemId.value.get(card.itemId)
      if (!linkId) return
      await equipItem({ linkId })
    }
    if (card.builtin) {
      themeStore.setTheme(card.themeKey)
    } else if (card.tokens) {
      themeStore.setThemeFromTokens(card.themeKey, card.tokens)
    }
  } catch {
  } finally {
    themeBusy.value = null
  }
}

const VISIBILITY_OPTIONS: { value: Visibility; label: string; description: string }[] = [
  { value: 'public', label: 'Public', description: 'Anyone can see this list and count.' },
  { value: 'followers_only', label: 'Followers only', description: 'Only people who follow you.' },
  { value: 'private', label: 'Private', description: 'Only you.' },
]

interface PrivacyControl {
  key: keyof PrivacySettings
  title: string
  hint: string
}

const PRIVACY_CONTROLS: PrivacyControl[] = [
  {
    key: 'privacy.followingVisibility',
    title: 'Following list',
    hint: 'Controls who can see the count and list of users you follow.',
  },
  {
    key: 'privacy.rivalsVisibility',
    title: 'Rivals list',
    hint: 'Controls who can see the count and list of users you have rivaled.',
  },
]

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

const {
  enabled: syncEnabled,
  saving: syncSaving,
  resyncQueued: syncResyncQueued,
  fetch: fetchSyncRaw,
  set: setSyncName,
} = useNameSyncSetting()

async function fetchSyncSetting() {
  if (!isLoggedIn.value) {
    syncEnabled.value = null
    return
  }
  await fetchSyncRaw()
}

const sections = computed<SectionDef[]>(() => [
  { key: 'appearance', label: 'Appearance', requiresLogin: false },
  { key: 'privacy', label: 'Privacy', requiresLogin: !isLoggedIn.value },
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

async function setVisibility(key: keyof PrivacySettings, value: Visibility) {
  if (settingsStore.privacy[key] === value || settingsStore.privacySaving) return
  await settingsStore.updatePrivacy(key, value)
}

onMounted(() => {
  if (isLoggedIn.value && !settingsStore.privacyLoaded) {
    void settingsStore.fetchPrivacy()
  }
  void loadThemes()
  void fetchSyncSetting()
})

watch(() => authStore.userId, () => {
  void loadThemes()
  void fetchSyncSetting()
})

watch(activeSection, (section) => {
  if (section === 'account') void fetchSyncSetting()
})
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
              <p class="settings-card__desc">
                Choose a theme. Defaults are always available; inventory themes unlock as you earn them.
              </p>
            </header>

            <div class="theme-grid" role="radiogroup" aria-label="Theme">
              <button
                v-for="card in themeCards"
                :key="card.id"
                type="button"
                class="theme-card"
                :class="{
                  'theme-card--active': themeStore.theme === card.themeKey,
                  'theme-card--locked': !card.owned,
                  'theme-card--builtin': card.builtin,
                }"
                role="radio"
                :aria-checked="themeStore.theme === card.themeKey"
                :disabled="!card.owned || themeBusy === card.id"
                :title="!card.owned ? lockedHint(card) : undefined"
                @click="pickTheme(card)"
              >
                <div class="theme-card__preview" :style="previewVars(card)">
                  <span class="theme-card__swatch theme-card__swatch--bg" />
                  <span class="theme-card__swatch theme-card__swatch--surface" />
                  <span class="theme-card__swatch theme-card__swatch--accent" />
                </div>
                <div class="theme-card__body">
                  <span class="theme-card__name">{{ card.name }}</span>
                  <span class="theme-card__hint">
                    <template v-if="card.builtin">Default theme</template>
                    <template v-else-if="card.owned">{{ card.description ?? 'Owned' }}</template>
                    <template v-else>{{ lockedHint(card) }}</template>
                  </span>
                </div>
                <span v-if="themeStore.theme === card.themeKey" class="theme-card__active-tag">Active</span>
                <span v-else-if="!card.owned" class="theme-card__lock-tag" aria-label="Locked">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                    stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
              </button>
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

        <template v-else-if="activeSection === 'privacy' && isLoggedIn">
          <section class="settings-card">
            <header class="settings-card__header">
              <h2 class="settings-card__title">Privacy</h2>
              <p class="settings-card__desc">
                Control who can see your following and rivals lists. Your followers and people who
                rival you are always visible.
              </p>
            </header>

            <div v-for="control in PRIVACY_CONTROLS" :key="control.key" class="settings-row">
              <div class="settings-row__label">
                <span class="settings-row__title">{{ control.title }}</span>
                <span class="settings-row__hint">{{ control.hint }}</span>
              </div>
              <div class="visibility-picker" role="radiogroup" :aria-label="control.title">
                <button v-for="opt in VISIBILITY_OPTIONS" :key="opt.value" type="button"
                  class="visibility-picker__btn"
                  :class="{ 'visibility-picker__btn--active': settingsStore.privacy[control.key] === opt.value }"
                  role="radio"
                  :aria-checked="settingsStore.privacy[control.key] === opt.value"
                  :title="opt.description"
                  :disabled="settingsStore.privacySaving"
                  @click="setVisibility(control.key, opt.value)">
                  {{ opt.label }}
                </button>
              </div>
            </div>

            <p v-if="settingsStore.privacyError" class="settings-card__error">
              {{ settingsStore.privacyError }}
            </p>
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

            <div v-if="isLoggedIn" class="settings-row">
              <div class="settings-row__label">
                <span class="settings-row__title">Sync display name from BeatLeader / ScoreSaber</span>
                <span class="settings-row__hint">
                  When off, your custom name stays put. When on, your platform name overwrites it once a day (4 AM).
                </span>
                <span v-if="syncResyncQueued" class="settings-row__notice">
                  Will resync on the next refresh.
                </span>
              </div>
              <div class="visibility-picker" role="radiogroup" aria-label="Name sync">
                <button type="button" class="visibility-picker__btn"
                  :class="{ 'visibility-picker__btn--active': syncEnabled === true }"
                  :disabled="syncSaving || syncEnabled === null"
                  role="radio" :aria-checked="syncEnabled === true"
                  @click="setSyncName(true)">On</button>
                <button type="button" class="visibility-picker__btn"
                  :class="{ 'visibility-picker__btn--active': syncEnabled === false }"
                  :disabled="syncSaving || syncEnabled === null"
                  role="radio" :aria-checked="syncEnabled === false"
                  @click="setSyncName(false)">Off</button>
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
  max-width: 1080px;
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

.settings-row__notice {
  margin-top: 4px;
  color: var(--page-accent);
  font-size: var(--text-caption);
}

.theme-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: var(--space-sm);
}

.theme-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md);
  background: var(--bg-base);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  color: var(--text-primary);
  font-family: var(--font-sans);
  text-align: left;
  cursor: pointer;
  transition: border-color 120ms ease, background-color 120ms ease;
}

.theme-card:hover:not(:disabled) {
  border-color: var(--text-tertiary);
}

.theme-card--active {
  border-color: var(--page-accent);
  background: color-mix(in srgb, var(--page-accent) 6%, var(--bg-base));
}

.theme-card--locked {
  cursor: not-allowed;
  opacity: 0.55;
}

.theme-card__preview {
  display: flex;
  flex-direction: column;
  gap: 3px;
  width: 56px;
  height: 40px;
  flex-shrink: 0;
  padding: 4px;
  border-radius: var(--radius-btn);
  border: 1px solid color-mix(in srgb, var(--preview-surface, var(--bg-overlay)) 60%, transparent);
  background: var(--preview-base, var(--bg-base));
}

.theme-card__swatch {
  display: block;
  height: 6px;
  border-radius: 2px;
}

.theme-card__swatch--bg { background: var(--preview-surface, var(--bg-elevated)); }
.theme-card__swatch--surface { background: var(--preview-elevated, var(--bg-overlay)); width: 70%; }
.theme-card__swatch--accent { background: var(--preview-accent, var(--page-accent)); width: 40%; }

.theme-card__body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.theme-card__name {
  font-size: var(--text-body);
  font-weight: 600;
  color: var(--text-primary);
}

.theme-card__hint {
  font-size: var(--text-caption);
  color: var(--text-secondary);
  line-height: 1.4;
}

.theme-card__active-tag {
  position: absolute;
  top: var(--space-xs);
  right: var(--space-xs);
  font-size: 0.5625rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--page-accent);
}

.theme-card__lock-tag {
  position: absolute;
  top: var(--space-xs);
  right: var(--space-xs);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--text-tertiary);
}

.visibility-picker {
  display: inline-flex;
  padding: 3px;
  background: var(--bg-base);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-btn);
  gap: 2px;
}

.visibility-picker__btn {
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

.visibility-picker__btn:hover:not(:disabled) {
  color: var(--text-primary);
}

.visibility-picker__btn--active {
  color: var(--page-accent);
  background: color-mix(in srgb, var(--page-accent) 10%, var(--bg-surface));
}

.visibility-picker__btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
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
