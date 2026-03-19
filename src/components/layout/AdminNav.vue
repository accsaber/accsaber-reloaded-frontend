<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { useRoute, useRouter } from 'vue-router'
import logoUrl from '@/assets/logo.png'

const auth = useAuthStore()
const theme = useThemeStore()
const route = useRoute()
const router = useRouter()

const navItems = [
  { to: '/?tab=users', tab: 'users', label: 'Users', icon: 'users' },
  { to: '/?tab=duplicates', tab: 'duplicates', label: 'Duplicates', icon: 'duplicates' },
  { to: '/?tab=staff', tab: 'staff', label: 'Staff', icon: 'staff' },
  { to: '/?tab=maps', tab: 'maps', label: 'Maps', icon: 'maps' },
  { to: '/?tab=batches', tab: 'batches', label: 'Batches', icon: 'batches' },
  { to: '/?tab=milestones', tab: 'milestones', label: 'Milestones', icon: 'milestones' },
  { to: '/?tab=campaigns', tab: 'campaigns', label: 'Campaigns', icon: 'campaigns' },
  { to: '/?tab=curves', tab: 'curves', label: 'Curves', icon: 'curves' },
  { to: '/?tab=operations', tab: 'operations', label: 'Operations', icon: 'operations' },
]

function isActive(tab: string): boolean {
  return (route.query.tab as string) === tab || (tab === 'users' && !route.query.tab)
}

async function handleLogout() {
  await auth.logout()
  router.push('/login')
}
</script>

<template>
  <nav class="nav">
    <div class="nav__logo">
      <img :src="logoUrl" alt="AccSaber" class="nav__logo-img" />
    </div>

    <div class="nav__items">
      <router-link
        v-for="item in navItems"
        :key="item.tab"
        :to="item.to"
        class="nav__item"
        :class="{ 'nav__item--active': isActive(item.tab) }"
        :aria-label="item.label"
      >
        <span class="nav__icon">
          <svg v-if="item.icon === 'users'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <svg v-else-if="item.icon === 'duplicates'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          <svg v-else-if="item.icon === 'staff'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <svg v-else-if="item.icon === 'maps'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" /><line x1="8" y1="2" x2="8" y2="18" /><line x1="16" y1="6" x2="16" y2="22" />
          </svg>
          <svg v-else-if="item.icon === 'batches'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" />
          </svg>
          <svg v-else-if="item.icon === 'milestones'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" />
          </svg>
          <svg v-else-if="item.icon === 'campaigns'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="3 11 22 2 13 21 11 13 3 11" />
          </svg>
          <svg v-else-if="item.icon === 'curves'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          <svg v-else-if="item.icon === 'operations'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" />
          </svg>
        </span>
        <span class="nav__label">{{ item.label }}</span>
      </router-link>
    </div>

    <div class="nav__footer">
      <button
        class="nav__footer-btn"
        :aria-label="theme.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
        @click="theme.toggle()"
      >
        <svg v-if="theme.theme === 'dark'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
        <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
        <span>{{ theme.theme === 'dark' ? 'Light' : 'Dark' }}</span>
      </button>

      <div class="nav__divider" />

      <div class="nav__user">
        <div class="nav__user-main">
          <img
            v-if="auth.userProfile?.avatarUrl"
            :src="auth.userProfile.avatarUrl"
            alt=""
            class="nav__avatar"
          />
          <div v-else class="nav__avatar nav__avatar--placeholder">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <div class="nav__user-text">
            <span class="nav__user-name">{{ auth.userProfile?.name ?? 'Admin' }}</span>
            <span class="nav__user-role">{{ auth.staffRole?.replace('_', ' ') ?? 'ADMIN' }}</span>
          </div>
        </div>
        <button class="nav__logout" aria-label="Logout" @click="handleLogout">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.nav {
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  width: 220px;
  background: var(--bg-surface);
  border-right: 1px solid var(--bg-overlay);
  display: flex;
  flex-direction: column;
  z-index: 100;
}

.nav__logo {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-lg) var(--space-md) var(--space-md);
}

.nav__logo-img {
  height: 32px;
  width: auto;
  object-fit: contain;
}

.nav__items {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: var(--space-xs) var(--space-sm);
  overflow-y: auto;
}

.nav__item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 10px;
  border-radius: var(--radius-btn);
  color: var(--text-secondary);
  font-size: var(--text-body);
  text-decoration: none;
  transition: background-color 80ms, color 80ms;
  position: relative;
}

.nav__item:hover {
  background: var(--bg-elevated);
  color: var(--text-primary);
}

.nav__item--active {
  background: color-mix(in srgb, var(--accent) 10%, transparent);
  color: var(--accent);
}

.nav__item--active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 6px;
  bottom: 6px;
  width: 3px;
  background: var(--accent);
  border-radius: 0 2px 2px 0;
}

.nav__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  flex-shrink: 0;
  opacity: 0.85;
}

.nav__item--active .nav__icon { opacity: 1; }

.nav__label {
  font-size: 13px;
  font-weight: 500;
}

.nav__footer {
  padding: var(--space-sm);
}

.nav__divider {
  height: 1px;
  background: var(--bg-overlay);
  margin: var(--space-xs) 2px;
}

.nav__footer-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 6px 10px;
  background: none;
  border: none;
  border-radius: var(--radius-btn);
  color: var(--text-tertiary);
  font-family: inherit;
  font-size: var(--text-caption);
  cursor: pointer;
  transition: background-color 80ms, color 80ms;
}

.nav__footer-btn:hover {
  background: var(--bg-elevated);
  color: var(--text-secondary);
}

.nav__user {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 6px;
  margin-top: 2px;
  border-radius: var(--radius-btn);
  transition: background-color 80ms;
}

.nav__user-main {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.nav__avatar {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  object-fit: cover;
  flex-shrink: 0;
}

.nav__avatar--placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-overlay);
  color: var(--text-tertiary);
}

.nav__user-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.nav__user-name {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nav__user-role {
  font-size: 10px;
  font-family: var(--font-mono);
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.nav__logout {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  background: none;
  border: none;
  border-radius: var(--radius-btn);
  color: var(--text-tertiary);
  cursor: pointer;
  transition: background-color 80ms, color 80ms;
}

.nav__logout:hover {
  background: color-mix(in srgb, var(--error) 10%, transparent);
  color: var(--error);
}
</style>
