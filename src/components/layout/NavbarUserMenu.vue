<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import ClanTag from '@/components/domain/ClanTag.vue'
import { onImageError } from '@/utils/media'
import { useNavbarPanel } from '@/composables/useNavbarPanel'
import { useOwnProfileLink } from '@/composables/useOwnProfileLink'
import { useAuthStore } from '@/stores/auth'
import { isStaffSubdomain } from '@/utils/subdomain'
import { computed, ref, watch } from 'vue'

const emit = defineEmits<{
  login: []
  signOut: []
  staffLogout: []
}>()

const authStore = useAuthStore()
const { goToOwnProfile, openOwnProfileInNewTab, ownProfileHref } = useOwnProfileLink()

const { open, rootRef } = useNavbarPanel()
const avatarFailed = ref(false)

watch(() => authStore.userProfile?.avatarUrl, () => {
  avatarFailed.value = false
})

const hasMenu = computed(() => authStore.isLoggedIn || authStore.isStaffAuthorized)
const showTradeOffers = computed(() => authStore.isLoggedIn && !isStaffSubdomain)

function onAvatarImgError(event: Event) {
  const fallback = authStore.userProfile?.avatarFallbackUrl ?? null
  const img = event.currentTarget as HTMLImageElement
  if (fallback && img.dataset.fellBack !== '1') {
    onImageError(fallback)(event)
    return
  }
  avatarFailed.value = true
}

function goProfile() {
  open.value = false
  goToOwnProfile()
}

function onTriggerAuxClick() {
  if (!authStore.isLoggedIn) return
  open.value = false
  openOwnProfileInNewTab()
}
</script>

<template>
  <div ref="rootRef" class="navbar-user">
    <BaseButton v-if="!hasMenu" variant="primary" class="navbar-user__login" @click="emit('login')">
      Log in
    </BaseButton>
    <button v-else type="button" class="navbar__icon-btn navbar-user__trigger"
      :class="{ 'navbar-user__trigger--open': open }" aria-label="Account menu" aria-haspopup="menu"
      :aria-expanded="open" @click="open = !open"
      @mousedown.middle.prevent @auxclick.middle="onTriggerAuxClick">
      <img v-if="authStore.isLoggedIn && authStore.userProfile?.avatarUrl && !avatarFailed"
        :src="authStore.userProfile.avatarUrl" :alt="authStore.userProfile.name"
        class="navbar-user__avatar" decoding="async" @error="onAvatarImgError" />
      <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    </button>

    <Transition name="pop">
      <div v-if="open" class="navbar-menu navbar-user__panel stagger" role="menu">
        <span v-if="authStore.userProfile" class="navbar-user__name">
          {{ authStore.userProfile.name }}
          <ClanTag v-if="authStore.userProfile.clan" :clan="authStore.userProfile.clan" size="sm" />
        </span>

        <a v-if="authStore.isLoggedIn && ownProfileHref" :href="ownProfileHref"
          :style="{ '--i': 0 }" class="navbar-menu__item" role="menuitem" @click.exact.prevent="goProfile">
          Profile
        </a>
        <router-link v-if="showTradeOffers" to="/trade-offers" :style="{ '--i': 1 }" class="navbar-menu__item"
          role="menuitem" @click="open = false">
          Trade Offers
        </router-link>
        <router-link to="/settings" :style="{ '--i': 2 }" class="navbar-menu__item" role="menuitem" @click="open = false">
          Settings
        </router-link>

        <button v-if="authStore.isAdmin" type="button"
          :style="{ '--i': 3 }" class="navbar-menu__item navbar-user__item--danger" role="menuitem"
          @click="open = false; emit('staffLogout')">
          Staff log out
        </button>
        <button v-if="authStore.isLoggedIn" type="button"
          :style="{ '--i': 4 }" class="navbar-menu__item navbar-user__item--danger" role="menuitem"
          @click="open = false; emit('signOut')">
          Log out
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.navbar-user {
  position: relative;
}

.navbar-user__trigger--open {
  color: var(--navbar-text-strong);
  background: color-mix(in srgb, var(--navbar-text-strong) 10%, transparent);
}

.navbar-user__avatar {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-btn);
  object-fit: cover;
}

.navbar-user__login {
  height: 36px;
}

.navbar-user__panel {
  right: 0;
  transform-origin: top right;
}

.navbar-user__name {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-xs) var(--space-md);
  color: var(--text-primary);
  font-size: var(--text-body);
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.navbar-user__item--danger {
  color: var(--error);
}

.navbar-user__item--danger:hover {
  color: var(--error);
  background: color-mix(in srgb, var(--error) 12%, transparent);
}
</style>
