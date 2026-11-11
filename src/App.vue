<script setup lang="ts">
import BaseBanner from '@/components/common/BaseBanner.vue'
import AppNavbar from '@/components/layout/AppNavbar.vue'
import { useBrandFavicon } from '@/composables/useBrandLogo'
import { useNotificationSocket } from '@/composables/useNotificationSocket'
import { useAuthStore } from '@/stores/auth'
import { useBackendStatusStore } from '@/stores/backendStatus'
import { useEssenceStore } from '@/stores/essence'
import { useRelationsStore } from '@/stores/relations'
import { useSettingsStore } from '@/stores/settings'
import { flushPendingScores } from '@/utils/practiceScores'
import { isCreativesSubdomain, isStaffSubdomain } from '@/utils/subdomain'
import { computed, defineAsyncComponent, watch } from 'vue'
import { useRoute } from 'vue-router'

const PreviewControlBar = isCreativesSubdomain
  ? defineAsyncComponent(() => import('@/components/layout/PreviewControlBar.vue'))
  : null

const MaintenancePage = defineAsyncComponent(() => import('@/views/offline/MaintenancePage.vue'))
const ClanChatBubble = defineAsyncComponent(() => import('@/components/layout/ClanChatBubble.vue'))
const ThemeBackdrop = defineAsyncComponent(() => import('@/components/cosmetics/backdrops/ThemeBackdrop.vue'))

const authStore = useAuthStore()
const backendStatus = useBackendStatusStore()
const essenceStore = useEssenceStore()
const relationsStore = useRelationsStore()
const settingsStore = useSettingsStore()
const route = useRoute()

useBrandFavicon()
useNotificationSocket()

if (!backendStatus.offline) void flushPendingScores()

const ownClan = computed(() => {
  if (isStaffSubdomain || !settingsStore.appearanceLoaded) return null
  if (!settingsStore.appearance['appearance.clanChatBubble']) return null
  return authStore.userProfile?.clan ?? null
})

const showClanChatBubble = computed(() => {
  const clan = ownClan.value
  if (!clan) return false
  const slugOrId = route.name === 'clan-detail' ? route.params.slugOrId : null
  return slugOrId !== clan.slug && slugOrId !== clan.id
})

const showLegacyBanner = computed(() => authStore.legacyUserIdDetected !== null)

function dismissLegacyBanner() {
  authStore.dismissLegacyMigration()
}

const showRestrictedBanner = computed(() => authStore.restricted)

function pinLeavingPage(el: Element) {
  if (!(el instanceof HTMLElement)) return
  const { offsetTop, offsetLeft, offsetWidth } = el
  el.style.position = 'absolute'
  el.style.top = `${offsetTop}px`
  el.style.left = `${offsetLeft}px`
  el.style.width = `${offsetWidth}px`
  el.style.maxHeight = `${Math.max(0, window.innerHeight - offsetTop - 1)}px`
  el.style.overflow = 'hidden'
}

function dismissRestrictedBanner() {
  authStore.clearRestricted()
}

watch(
  () => authStore.isLoggedIn,
  (loggedIn, wasLoggedIn) => {
    if (loggedIn) {
      void relationsStore.fetchAll()
      void settingsStore.fetchPrivacy()
      void settingsStore.fetchAppearance()
    } else if (wasLoggedIn) {
      relationsStore.reset()
      settingsStore.reset()
      essenceStore.reset()
    }
  },
  { immediate: true },
)
</script>

<template>
  <ThemeBackdrop />
  <MaintenancePage v-if="backendStatus.offline" />
  <template v-else>
    <AppNavbar />
    <main class="main-content">
      <BaseBanner v-if="showRestrictedBanner" variant="error" @close="dismissRestrictedBanner">
        Your account is restricted. You can still browse, but creating or changing content is
        disabled. Contact staff if you think this is a mistake.
      </BaseBanner>
      <BaseBanner v-if="showLegacyBanner" variant="info" @close="dismissLegacyBanner">
        We've upgraded login. Please log in again with Discord, BeatLeader, or Steam to restore your
        personalized experience.
      </BaseBanner>
      <router-view v-slot="{ Component }">
        <transition name="page" @before-leave="pinLeavingPage">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
    <ClanChatBubble v-if="showClanChatBubble && ownClan" :clan="ownClan" />
    <component :is="PreviewControlBar" v-if="PreviewControlBar" />
  </template>
</template>

<style scoped>
.main-content {
  position: relative;
  min-height: calc(100svh - var(--navbar-height));
  padding: var(--space-xl);
  padding-top: calc(var(--navbar-height) + var(--space-xl));
}

.page-enter-active {
  transition:
    opacity var(--dur-enter) var(--ease-out),
    transform var(--dur-enter) var(--ease-out);
}

.page-leave-active {
  transition:
    opacity var(--dur-fast) var(--ease-out),
    transform var(--dur-fast) var(--ease-out);
}

.page-enter-from {
  opacity: 0;
  transform: translateX(8px);
}

.page-leave-to {
  opacity: 0;
  transform: translateX(-8px);
}

@media (max-width: 767px) {
  .main-content {
    padding: var(--space-md);
    padding-top: calc(var(--navbar-height) + var(--space-md));
  }
}
</style>
