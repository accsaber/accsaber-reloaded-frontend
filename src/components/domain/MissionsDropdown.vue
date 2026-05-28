<script setup lang="ts">
import BaseDropdown from '@/components/common/BaseDropdown.vue'
import type { UserMissionResponse } from '@/types/api/missions'
import { defineAsyncComponent, ref } from 'vue'

const MISSIONS_COMING_SOON = false

const MissionsPanel = defineAsyncComponent(() => import('@/components/domain/MissionsPanel.vue'))

async function loadActive(): Promise<UserMissionResponse[]> {
  const { getMyMissions } = await import('@/api/missions')
  return getMyMissions()
}

async function loadHistory(): Promise<UserMissionResponse[]> {
  const { getMyCompletedMissions } = await import('@/api/missions')
  return getMyCompletedMissions()
}

const open = ref(false)

function handleNavigate() {
  open.value = false
}
</script>

<template>
  <BaseDropdown v-model:open="open" position="bottom-right">
    <template #trigger>
      <button
        type="button"
        class="navbar__icon-btn missions-trigger"
        :class="{ 'missions-trigger--active': open }"
        aria-label="Missions"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="6" />
          <circle cx="12" cy="12" r="2" />
        </svg>
      </button>
    </template>

    <div v-if="MISSIONS_COMING_SOON" class="missions-coming-soon">
      <header class="missions-coming-soon__head">
        <h2 class="missions-coming-soon__title">Missions</h2>
      </header>
      <div class="missions-coming-soon__body">
        <span class="missions-coming-soon__badge">Coming soon</span>
        <p class="missions-coming-soon__message">
          Daily and weekly missions are on the way. Check back soon.
        </p>
      </div>
    </div>

    <div v-else class="missions-dropdown-panel">
      <MissionsPanel
        :active="open"
        :load-active="loadActive"
        :load-history="loadHistory"
        @navigate="handleNavigate"
      />
    </div>
  </BaseDropdown>
</template>

<style scoped>
.missions-trigger--active {
  color: var(--text-primary);
  background: var(--bg-elevated);
}

:deep(.base-dropdown__panel) {
  width: min(440px, calc(100vw - 32px));
  min-width: unset;
  padding: 0;
  background: color-mix(in srgb, var(--bg-elevated) 96%, transparent);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35);
}

.missions-dropdown-panel {
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - var(--navbar-height) - 24px);
}

.missions-coming-soon {
  display: flex;
  flex-direction: column;
}

.missions-coming-soon__head {
  padding: var(--space-sm) var(--space-md);
  border-bottom: 1px solid var(--bg-overlay);
}

.missions-coming-soon__title {
  margin: 0;
  font-family: var(--font-sans);
  font-size: var(--text-card-title);
  font-weight: 700;
  color: var(--text-primary);
}

.missions-coming-soon__body {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  padding: var(--space-2xl) var(--space-lg);
  text-align: center;
}

.missions-coming-soon__badge {
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent) 40%, transparent);
  border-radius: var(--radius-btn);
  padding: 4px var(--space-sm);
}

.missions-coming-soon__message {
  margin: 0;
  font-size: var(--text-body);
  color: var(--text-secondary);
  max-width: 260px;
  line-height: 1.5;
}

@media (max-width: 600px) {
  :deep(.base-dropdown__panel) {
    position: fixed;
    top: calc(var(--navbar-height) + var(--space-xs));
    left: var(--space-md);
    right: var(--space-md);
    width: auto;
    max-width: none;
    margin: 0;
  }

  .missions-dropdown-panel {
    max-height: calc(100vh - var(--navbar-height) - var(--space-md) - var(--space-xs));
  }
}
</style>
