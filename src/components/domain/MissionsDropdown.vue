<script setup lang="ts">
import type { UserMissionResponse } from '@/types/api/missions'
import { defineAsyncComponent, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'

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
const triggerRef = ref<HTMLButtonElement | null>(null)
const panelRef = ref<HTMLElement | null>(null)
const panelStyle = ref<Record<string, string>>({})

function updatePosition() {
  const trigger = triggerRef.value
  if (!trigger) return
  const rect = trigger.getBoundingClientRect()
  const isNarrow = window.matchMedia('(max-width: 600px)').matches
  if (isNarrow) {
    panelStyle.value = {
      top: `${rect.bottom + 4}px`,
      left: '16px',
      right: '16px',
      width: 'auto',
      maxWidth: 'none',
    }
  } else {
    panelStyle.value = {
      top: `${rect.bottom + 4}px`,
      right: `${Math.max(window.innerWidth - rect.right, 8)}px`,
      width: 'min(440px, calc(100vw - 32px))',
    }
  }
}

function onClickOutside(e: MouseEvent) {
  if (!open.value) return
  const target = e.target as Node | null
  if (!target) return
  if (triggerRef.value?.contains(target)) return
  if (panelRef.value?.contains(target)) return
  open.value = false
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') open.value = false
}

function onViewportChange() {
  if (open.value) updatePosition()
}

watch(open, async (value) => {
  if (value) {
    await nextTick()
    updatePosition()
  }
})

onMounted(() => {
  document.addEventListener('click', onClickOutside)
  document.addEventListener('keydown', onKeydown)
  window.addEventListener('resize', onViewportChange)
  window.addEventListener('scroll', onViewportChange, true)
})

onUnmounted(() => {
  document.removeEventListener('click', onClickOutside)
  document.removeEventListener('keydown', onKeydown)
  window.removeEventListener('resize', onViewportChange)
  window.removeEventListener('scroll', onViewportChange, true)
})

function handleNavigate() {
  open.value = false
}

function toggle() {
  open.value = !open.value
}
</script>

<template>
  <button
    ref="triggerRef"
    type="button"
    class="navbar__icon-btn missions-trigger"
    :class="{ 'missions-trigger--active': open }"
    aria-label="Missions"
    @click="toggle"
  >
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  </button>

  <Teleport to="body">
    <Transition name="missions-dropdown">
      <div
        v-if="open"
        ref="panelRef"
        class="missions-dropdown-panel"
        :style="panelStyle"
      >
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

        <div v-else class="missions-dropdown-panel__inner">
          <MissionsPanel
            :active="open"
            :load-active="loadActive"
            :load-history="loadHistory"
            @navigate="handleNavigate"
          />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.missions-trigger--active {
  color: var(--text-primary);
  background: var(--bg-elevated);
}

.missions-dropdown-panel {
  position: fixed;
  z-index: 200;
  background: var(--bg-elevated);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35);
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - var(--navbar-height) - 24px);
  overflow: hidden;
}

.missions-dropdown-panel__inner {
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1;
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

.missions-dropdown-enter-active,
.missions-dropdown-leave-active {
  transition: opacity 100ms ease, transform 100ms ease;
}

.missions-dropdown-enter-from,
.missions-dropdown-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

@media (prefers-reduced-motion: reduce) {
  .missions-dropdown-enter-active,
  .missions-dropdown-leave-active {
    transition: none;
  }
}
</style>
