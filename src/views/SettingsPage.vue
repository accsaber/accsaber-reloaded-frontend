<script setup lang="ts">
import '@/assets/styles/settings.css'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import ImageUploader from '@/components/common/ImageUploader.vue'
import PageHeaderBleed from '@/components/common/PageHeaderBleed.vue'
import PseudoLoginModal from '@/components/domain/PseudoLoginModal.vue'
import { useNameSyncSetting } from '@/composables/useNameSyncSetting'
import { usePageMeta } from '@/composables/usePageMeta'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import type {
  AppearanceSettings,
  ComplexityNumberStyle,
  PrivacySettings,
  ReplayService,
  ScoreRowField,
  Visibility,
} from '@/types/api/settings'
import { useAppearance } from '@/composables/useAppearance'
import ScoreFieldEditor from './settings/ScoreFieldEditor.vue'
import { isRankingSubdomain } from '@/utils/subdomain'
import { onAvatarError, pickAvatarFallback, pickAvatarUrl } from '@/composables/useAvatarFallback'
import { computed, onMounted, ref, watch } from 'vue'
import BlockedUsersSection from './settings/BlockedUsersSection.vue'
import ConnectionsSection from './settings/ConnectionsSection.vue'
import NotificationSettingsSection from './settings/NotificationSettingsSection.vue'
import SettingsPicker from './settings/SettingsPicker.vue'
import ThemeCatalog from './settings/ThemeCatalog.vue'

usePageMeta({
  title: 'Settings | AccSaber',
  description: 'Manage appearance, account, and linked accounts.',
})

type SectionKey = 'appearance' | 'notifications' | 'privacy' | 'account'

interface SectionDef {
  key: SectionKey
  label: string
  requiresLogin: boolean
}

const authStore = useAuthStore()
const settingsStore = useSettingsStore()

const VISIBILITY_OPTIONS = [
  { value: 'public' as const, label: 'Public', description: 'Anyone can see this list and count.' },
  { value: 'followers_only' as const, label: 'Followers only', description: 'Only people who follow you.' },
  { value: 'private' as const, label: 'Private', description: 'Only you.' },
]

const PRIVACY_CONTROLS: { key: keyof PrivacySettings; title: string }[] = [
  {
    key: 'privacy.followingVisibility',
    title: 'Following list',
  },
  {
    key: 'privacy.rivalsVisibility',
    title: 'Rivals list',
  },
]

const REPLAY_SERVICE_OPTIONS = [
  { value: 'beatleader' as const, label: 'BeatLeader', description: 'Open replays in BeatLeader.' },
  { value: 'arcviewer' as const, label: 'ArcViewer', description: 'Open replays in ArcViewer.' },
  { value: 'chroviewer' as const, label: 'ChroViewer', description: 'Open replays in ChroViewer.' },
]

const COMPLEXITY_STYLE_OPTIONS = [
  { value: 'colored' as const, label: 'Colored', description: 'Tint the number by complexity tier.' },
  { value: 'plain' as const, label: 'Plain', description: 'Render the number in body text.' },
]

const ON_OFF_OPTIONS = [
  { value: true, label: 'On' },
  { value: false, label: 'Off' },
]

const NAME_SYNC_OPTIONS = ON_OFF_OPTIONS

const me = computed(() => authStore.authMe)
const meAvatarUrl = computed(() => pickAvatarUrl(me.value))
const meAvatarFallback = computed(() => pickAvatarFallback(me.value))
const handleMeAvatarError = (e: Event) => onAvatarError(meAvatarFallback.value)(e)
const isLoggedIn = computed(() => authStore.isLoggedIn)
const canAccessAccount = computed(
  () => isLoggedIn.value || (isRankingSubdomain && authStore.isStaffAuthorized),
)
const activeSection = ref<SectionKey>('appearance')
const logoutConfirm = ref(false)
const loginModalOpen = ref(false)

const {
  enabled: syncEnabled,
  saving: syncSaving,
  resyncQueued: syncResyncQueued,
  fetch: fetchSyncRaw,
  set: setSyncName,
} = useNameSyncSetting()

const avatarSyncEnabled = ref<boolean | null>(null)
const avatarSyncSaving = ref(false)
const avatarResyncQueued = ref(false)
let avatarResyncTimer: ReturnType<typeof setTimeout> | null = null

async function fetchAvatarSyncSetting() {
  if (!isLoggedIn.value) {
    avatarSyncEnabled.value = null
    return
  }
  try {
    const { getMySyncSettings } = await import('@/api/users')
    const res = await getMySyncSettings()
    avatarSyncEnabled.value = res['sync.avatar'] ?? true
  } catch {
    avatarSyncEnabled.value = null
  }
}

async function setSyncAvatar(next: boolean) {
  if (
    avatarSyncSaving.value
    || avatarSyncEnabled.value === null
    || avatarSyncEnabled.value === next
  ) return
  avatarSyncSaving.value = true
  const wasOff = avatarSyncEnabled.value === false
  try {
    const { putMySyncSettings } = await import('@/api/users')
    await putMySyncSettings({
      'sync.name': syncEnabled.value ?? true,
      'sync.avatar': next,
    })
    avatarSyncEnabled.value = next
    if (wasOff && next) {
      avatarResyncQueued.value = true
      if (avatarResyncTimer) clearTimeout(avatarResyncTimer)
      avatarResyncTimer = setTimeout(() => { avatarResyncQueued.value = false }, 6000)
    }
  } catch {
  } finally {
    avatarSyncSaving.value = false
  }
}

async function uploadAvatar(file: File) {
  const { uploadMyAvatar } = await import('@/api/cdn')
  await uploadMyAvatar(file)
  await Promise.all([authStore.fetchAuthMe(), fetchAvatarSyncSetting()])
}

async function fetchSyncSetting() {
  if (!isLoggedIn.value) {
    syncEnabled.value = null
    avatarSyncEnabled.value = null
    return
  }
  await Promise.all([fetchSyncRaw(), fetchAvatarSyncSetting()])
}

const sections = computed<SectionDef[]>(() => [
  { key: 'appearance', label: 'Appearance', requiresLogin: false },
  { key: 'notifications', label: 'Notifications', requiresLogin: !isLoggedIn.value },
  { key: 'privacy', label: 'Privacy', requiresLogin: !isLoggedIn.value },
  { key: 'account', label: 'Account', requiresLogin: !canAccessAccount.value },
])

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

const {
  primaryReplayService,
  complexityNumberStyle,
  complexityBar,
  scoreRowFields,
  hideReloadedProfileFeatures,
  showStatisticsChart,
} = useAppearance()

const rawFallbackReplayService = computed(
  () => settingsStore.appearance['appearance.fallbackReplayService'],
)

const fallbackReplayOptions = computed(() => [
  { value: '' as const, label: 'None', description: 'Do not retry with another viewer.' },
  ...REPLAY_SERVICE_OPTIONS.filter((o) => o.value !== primaryReplayService.value),
])

async function setAppearance<K extends keyof AppearanceSettings>(
  key: K,
  value: AppearanceSettings[K],
) {
  if (!isLoggedIn.value) {
    loginModalOpen.value = true
    return
  }
  if (settingsStore.appearance[key] === value || settingsStore.appearanceSaving) return
  await settingsStore.updateAppearance(key, value)
}

async function setReplayService(value: ReplayService) {
  if (rawFallbackReplayService.value === value) {
    await setAppearance('appearance.fallbackReplayService', null)
  }
  await setAppearance('appearance.primaryReplayService', value)
}

async function setFallbackReplayService(value: ReplayService | '') {
  await setAppearance('appearance.fallbackReplayService', value === '' ? null : value)
}

async function setScoreRowFields(value: ScoreRowField[]) {
  if (!isLoggedIn.value) {
    loginModalOpen.value = true
    return
  }
  await settingsStore.updateAppearance('appearance.scoreRowFields', value)
}

onMounted(() => {
  if (isLoggedIn.value && !settingsStore.privacyLoaded) {
    void settingsStore.fetchPrivacy()
  }
  if (isLoggedIn.value && !settingsStore.appearanceLoaded) {
    void settingsStore.fetchAppearance()
  }
  void fetchSyncSetting()
})

watch(() => authStore.userId, () => {
  void fetchSyncSetting()
  if (isLoggedIn.value && !settingsStore.appearanceLoaded) {
    void settingsStore.fetchAppearance()
  }
})

watch(activeSection, (section) => {
  if (section === 'account') void fetchSyncSetting()
})
</script>

<template>
  <div class="settings" :style="{ '--page-accent': 'var(--accent-overall)' }">
    <PageHeaderBleed title="Settings" />

    <div class="settings__layout">
      <nav class="settings__nav" aria-label="Settings sections">
        <button v-for="section in sections" :key="section.key" type="button" class="settings__nav-btn" :class="{
          'settings__nav-btn--active': activeSection === section.key,
          'settings__nav-btn--locked': section.requiresLogin,
        }" @click="selectSection(section)">
          <span class="settings__nav-label">{{ section.label }}</span>
          <svg v-if="section.requiresLogin" class="settings__nav-lock" width="14" height="14" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
            aria-label="Locked">
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
            </header>
            <ThemeCatalog />
          </section>

          <section class="settings-card">
            <header class="settings-card__header">
              <h2 class="settings-card__title">Replay service</h2>
            </header>

            <div class="settings-row">
              <div class="settings-row__label">
                <span class="settings-row__title">Primary replay service</span>
              </div>
              <SettingsPicker :model-value="primaryReplayService" :options="REPLAY_SERVICE_OPTIONS"
                aria-label="Primary replay service" :disabled="settingsStore.appearanceSaving"
                @update:model-value="(v) => setReplayService(v as ReplayService)" />
            </div>

            <div class="settings-row">
              <div class="settings-row__label">
                <span class="settings-row__title">Fallback replay service</span>
              </div>
              <SettingsPicker :model-value="rawFallbackReplayService ?? ''" :options="fallbackReplayOptions"
                aria-label="Fallback replay service" :disabled="settingsStore.appearanceSaving"
                @update:model-value="(v) => setFallbackReplayService(v as ReplayService | '')" />
            </div>

            <p v-if="settingsStore.appearanceError" class="settings-card__error">
              {{ settingsStore.appearanceError }}
            </p>
          </section>

          <section class="settings-card">
            <header class="settings-card__header">
              <h2 class="settings-card__title">Complexity</h2>
            </header>

            <div class="settings-row">
              <div class="settings-row__label">
                <span class="settings-row__title">Number style</span>
              </div>
              <SettingsPicker :model-value="complexityNumberStyle" :options="COMPLEXITY_STYLE_OPTIONS"
                aria-label="Complexity number style" :disabled="settingsStore.appearanceSaving"
                @update:model-value="(v) => setAppearance('appearance.complexityNumberStyle', v as ComplexityNumberStyle)" />
            </div>

            <div class="settings-row">
              <div class="settings-row__label">
                <span class="settings-row__title">Complexity bar</span>
              </div>
              <SettingsPicker :model-value="complexityBar" :options="ON_OFF_OPTIONS"
                aria-label="Complexity bar" :disabled="settingsStore.appearanceSaving"
                @update:model-value="(v) => setAppearance('appearance.complexityBar', v as boolean)" />
            </div>
          </section>

          <section class="settings-card">
            <header class="settings-card__header">
              <h2 class="settings-card__title">Score rows</h2>
            </header>

            <ScoreFieldEditor :model-value="scoreRowFields" :disabled="settingsStore.appearanceSaving"
              @update:model-value="setScoreRowFields" />
          </section>

          <section class="settings-card">
            <header class="settings-card__header">
              <h2 class="settings-card__title">Profiles</h2>
            </header>

            <div class="settings-row">
              <div class="settings-row__label">
                <span class="settings-row__title">Hide profile extras</span>
              </div>
              <SettingsPicker :model-value="hideReloadedProfileFeatures" :options="ON_OFF_OPTIONS"
                aria-label="Hide profile extras" :disabled="settingsStore.appearanceSaving"
                @update:model-value="(v) => setAppearance('appearance.hideReloadedProfileFeatures', v as boolean)" />
            </div>

            <div class="settings-row">
              <div class="settings-row__label">
                <span class="settings-row__title">Statistics chart on profile</span>
              </div>
              <SettingsPicker :model-value="showStatisticsChart" :options="ON_OFF_OPTIONS"
                aria-label="Statistics chart on profile" :disabled="settingsStore.appearanceSaving"
                @update:model-value="(v) => setAppearance('appearance.showStatisticsChart', v as boolean)" />
            </div>
          </section>

          <section v-if="!canAccessAccount" class="settings-card settings-card--gated">
            <header class="settings-card__header">
              <h2 class="settings-card__title">More options locked</h2>
            </header>
            <BaseButton variant="primary" @click="loginModalOpen = true">Sign in</BaseButton>
          </section>
        </template>

        <template v-else-if="activeSection === 'notifications' && isLoggedIn">
          <NotificationSettingsSection />
        </template>

        <template v-else-if="activeSection === 'privacy' && isLoggedIn">
          <section class="settings-card">
            <header class="settings-card__header">
              <h2 class="settings-card__title">Privacy</h2>
            </header>

            <div v-for="control in PRIVACY_CONTROLS" :key="control.key" class="settings-row">
              <div class="settings-row__label">
                <span class="settings-row__title">{{ control.title }}</span>
              </div>
              <SettingsPicker :model-value="settingsStore.privacy[control.key] as Visibility"
                :options="VISIBILITY_OPTIONS"
                :aria-label="control.title" :disabled="settingsStore.privacySaving"
                @update:model-value="(v) => setVisibility(control.key, v as Visibility)" />
            </div>

            <p v-if="settingsStore.privacyError" class="settings-card__error">
              {{ settingsStore.privacyError }}
            </p>
          </section>

          <BlockedUsersSection />
        </template>

        <template v-else-if="activeSection === 'account' && canAccessAccount">
          <section class="settings-card">
            <header class="settings-card__header">
              <h2 class="settings-card__title">Account</h2>
            </header>

            <div v-if="me" class="settings-profile settings-profile--with-uploader">
              <div class="settings-profile__avatar-block">
                <ImageUploader v-if="isLoggedIn" label="Avatar" aspect-ratio="1 / 1"
                  :image-url="meAvatarUrl || null" :upload-handler="uploadAvatar" />
                <img v-else-if="meAvatarUrl" :src="meAvatarUrl" :alt="me.name"
                  class="settings-profile__avatar" decoding="async" @error="handleMeAvatarError" />
              </div>
              <div class="settings-profile__text">
                <span class="settings-profile__name">{{ me.name }}</span>
                <span v-if="me.country" class="settings-profile__country">{{ me.country }}</span>
              </div>
            </div>

            <div v-if="isLoggedIn" class="settings-row">
              <div class="settings-row__label">
                <span class="settings-row__title">Sync display name from BeatLeader / ScoreSaber</span>
                <span v-if="syncResyncQueued" class="settings-row__notice">
                  Will resync on the next refresh.
                </span>
              </div>
              <SettingsPicker :model-value="syncEnabled" :options="NAME_SYNC_OPTIONS" aria-label="Name sync"
                :disabled="syncSaving || syncEnabled === null"
                @update:model-value="(v) => setSyncName(v as boolean)" />
            </div>

            <div v-if="isLoggedIn" class="settings-row">
              <div class="settings-row__label">
                <span class="settings-row__title">Sync avatar from BeatLeader / ScoreSaber</span>
                <span v-if="avatarResyncQueued" class="settings-row__notice">
                  Will resync on the next refresh.
                </span>
              </div>
              <SettingsPicker :model-value="avatarSyncEnabled" :options="NAME_SYNC_OPTIONS"
                aria-label="Avatar sync"
                :disabled="avatarSyncSaving || avatarSyncEnabled === null"
                @update:model-value="(v) => setSyncAvatar(v as boolean)" />
            </div>
          </section>

          <ConnectionsSection v-if="isLoggedIn && me" :me="me" />

          <section class="settings-card">
            <div class="settings-row">
              <div class="settings-row__label">
                <span class="settings-row__title">Sign out</span>
              </div>
              <BaseButton variant="destructive" @click="logoutConfirm = true">Log out</BaseButton>
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

.settings-card--gated {
  background: color-mix(in srgb, var(--page-accent) 4%, var(--bg-surface));
  border-color: color-mix(in srgb, var(--page-accent) 30%, transparent);
  align-items: flex-start;
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

.settings-profile--with-uploader {
  align-items: flex-start;
}

.settings-profile__avatar-block {
  width: 128px;
  flex-shrink: 0;
}

@media (max-width: 480px) {
  .settings-profile--with-uploader {
    flex-direction: column;
    align-items: stretch;
  }

  .settings-profile__avatar-block {
    width: 100%;
  }
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
}
</style>
