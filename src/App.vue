<script setup lang="ts">
import AppNavbar from '@/components/layout/AppNavbar.vue'
import { useAuthStore } from '@/stores/auth'
import { computed } from 'vue'

const authStore = useAuthStore()

const showLegacyBanner = computed(() => authStore.legacyUserIdDetected !== null)

function dismissLegacyBanner() {
  authStore.dismissLegacyMigration()
}
</script>

<template>
  <AppNavbar />
  <main class="main-content">
    <div v-if="showLegacyBanner" class="legacy-banner" role="status">
      <span class="legacy-banner__text">
        We've upgraded login. Please log in again with Discord, BeatLeader, or Steam to restore your
        personalized experience.
      </span>
      <button class="legacy-banner__close" aria-label="Dismiss" @click="dismissLegacyBanner">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
    <router-view v-slot="{ Component }">
      <transition name="page">
        <component :is="Component" />
      </transition>
    </router-view>
  </main>
</template>

<style scoped>
.main-content {
  min-height: calc(100vh - var(--navbar-height));
  padding: var(--space-xl);
  padding-top: calc(var(--navbar-height) + var(--space-xl));
}

.legacy-banner {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  max-width: 960px;
  margin: 0 auto var(--space-lg);
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-left: 3px solid var(--accent, var(--info));
  border-radius: var(--radius-card);
  color: var(--text-secondary);
  font-size: var(--text-body);
}

.legacy-banner__text {
  flex: 1;
  line-height: 1.5;
}

.legacy-banner__close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: none;
  border: none;
  color: var(--text-secondary);
  border-radius: var(--radius-btn);
  cursor: pointer;
  flex-shrink: 0;
}

.legacy-banner__close:hover {
  color: var(--text-primary);
  background: var(--bg-elevated);
}

.page-enter-active,
.page-leave-active {
  transition:
    opacity 150ms ease,
    transform 150ms ease;
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
    min-height: calc(100vh - var(--navbar-height));
    padding: var(--space-md);
    padding-top: calc(var(--navbar-height) + var(--space-md));
  }
}
</style>
