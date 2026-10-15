<script setup lang="ts">
import SkeletonLoader from '@/components/common/SkeletonLoader.vue';
import { useFloatingPanel } from '@/composables/useFloatingPanel';
import UserChip from '@/components/domain/UserChip.vue';
import type { MilestoneHolderResponse } from '@/types/api/milestones';
import { formatRelativeDate } from '@/utils/formatters';
import { ref, watch } from 'vue';

const props = defineProps<{
  milestoneId: string
  completions: number
}>()

const holders = ref<MilestoneHolderResponse[]>([])
const loading = ref(true)
const fetched = ref(false)
const { isOpen, triggerRef, panelRef, panelStyle, onTriggerEnter, onTriggerLeave, onPanelEnter, onPanelLeave } =
  useFloatingPanel({
    width: 'auto',
    side: 'above',
    align: 'end',
    gap: 8,
    hover: { openDelay: 600, closeDelay: 150 },
  })

watch(isOpen, (value) => {
  if (value && !fetched.value) fetchHolders()
})

async function fetchHolders() {
  fetched.value = true
  try {
    const { getMilestoneHolders } = await import('@/api/milestones')
    const res = await getMilestoneHolders(props.milestoneId)
    holders.value = res.content
  } catch {
    holders.value = []
  }
  loading.value = false
}
</script>

<template>
  <span ref="triggerRef" class="holder-trigger" @mouseenter="onTriggerEnter" @mouseleave="onTriggerLeave">
    <span class="holder-trigger__pill">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
        stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    </span>

    <Teleport to="body">
      <Transition name="holder-tooltip">
        <div v-if="isOpen" ref="panelRef" class="holder-popup" :style="panelStyle"
          @mouseenter="onPanelEnter" @mouseleave="onPanelLeave">
          <div class="holder-popup__card">
            <div class="holder-popup__header">
              <span class="field-label">Completed by</span>
              <span class="holder-popup__count">{{ completions }}</span>
            </div>

            <SkeletonLoader v-if="loading" class="holder-popup__loading" variant="text"
              :lines="Math.min(completions, 5)" />

            <div v-else-if="holders.length === 0" class="holder-popup__empty">
              Couldn't load holders
            </div>

            <div v-else class="holder-popup__list">
              <router-link v-for="h in holders" :key="h.player.id"
                :to="{ name: 'player-profile', params: { userId: h.player.id } }" class="holder-popup__row">
                <UserChip :user="h.player" size="sm" class="holder-popup__player" />
                <span class="holder-popup__time">{{ formatRelativeDate(h.completedAt) }}</span>
              </router-link>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </span>
</template>

<style scoped>
.holder-trigger {
  position: relative;
  display: inline-flex;
  align-items: center;
  cursor: help;
}

.holder-trigger__pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--bg-elevated);
  border: 1px solid var(--bg-overlay);
  color: var(--text-secondary);
  transition: border-color 120ms ease, color 120ms ease, background-color 120ms ease;
}

.holder-trigger:hover .holder-trigger__pill {
  color: var(--text-primary);
  border-color: var(--text-tertiary);
  background: var(--bg-overlay);
}

.holder-popup {
  z-index: 10000;
}

.holder-popup__card {
  width: 280px;
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  overflow: hidden;
  filter: drop-shadow(0 8px 24px rgba(0, 0, 0, 0.4));
}

.holder-popup__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-sm) var(--space-md);
  border-bottom: 1px solid var(--bg-overlay);
}

.holder-popup__count {
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--text-tertiary);
}

.holder-popup__list {
  display: flex;
  flex-direction: column;
  max-height: 260px;
  overflow-y: auto;
}

.holder-popup__row {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-xs) var(--space-md);
  transition: background-color 80ms ease;
}

.holder-popup__row:hover {
  background: var(--bg-elevated);
}

.holder-popup__player {
  flex: 1;
  font-size: var(--text-caption);
}

.holder-popup__time {
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--text-tertiary);
  flex-shrink: 0;
}

.holder-popup__loading {
  padding: var(--space-sm) var(--space-md);
}

.holder-popup__empty {
  padding: var(--space-md);
  text-align: center;
  font-size: var(--text-caption);
  color: var(--text-tertiary);
}

.holder-tooltip-enter-active {
  transition: opacity 150ms ease-out, transform 150ms ease-out;
}

.holder-tooltip-leave-active {
  transition: opacity 100ms ease-in, transform 100ms ease-in;
}

.holder-tooltip-enter-from,
.holder-tooltip-leave-to {
  opacity: 0;
  transform: translateY(4px);
}

@media (prefers-reduced-motion: reduce) {

  .holder-tooltip-enter-active,
  .holder-tooltip-leave-active {
    transition: none;
  }
}
</style>
