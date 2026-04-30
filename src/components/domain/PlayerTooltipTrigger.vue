<script setup lang="ts">
import PlayerTooltipCard from '@/components/domain/PlayerTooltipCard.vue';
import { onUnmounted, ref } from 'vue';

defineProps<{
  userId: string
  userName: string
  avatarUrl: string
  country: string
}>()

const showTooltip = ref(false)
const triggerRef = ref<HTMLElement | null>(null)
const tooltipStyle = ref<Record<string, string>>({})
let hoverTimer: ReturnType<typeof setTimeout> | null = null

const SCROLL_OPTS: AddEventListenerOptions = { capture: true, passive: true }

function updatePosition() {
  const el = triggerRef.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  tooltipStyle.value = {
    position: 'fixed',
    top: `${rect.bottom + 8}px`,
    left: `${rect.left}px`,
  }
}

function onScrollOrResize() {
  if (!showTooltip.value) return
  updatePosition()
}

function attachListeners() {
  window.addEventListener('scroll', onScrollOrResize, SCROLL_OPTS)
  window.addEventListener('resize', onScrollOrResize, { passive: true })
}

function detachListeners() {
  window.removeEventListener('scroll', onScrollOrResize, SCROLL_OPTS)
  window.removeEventListener('resize', onScrollOrResize)
}

function onMouseEnter() {
  hoverTimer = setTimeout(() => {
    updatePosition()
    showTooltip.value = true
    attachListeners()
  }, 800)
}

function onMouseLeave() {
  if (hoverTimer) {
    clearTimeout(hoverTimer)
    hoverTimer = null
  }
  showTooltip.value = false
  detachListeners()
}

onUnmounted(() => {
  if (hoverTimer) clearTimeout(hoverTimer)
  detachListeners()
})
</script>

<template>
  <span ref="triggerRef" class="tooltip-trigger" @mouseenter="onMouseEnter" @mouseleave="onMouseLeave">
    <slot />
    <Teleport to="body">
      <Transition name="tooltip">
        <div v-if="showTooltip" class="tooltip-trigger__popup" :style="tooltipStyle">
          <PlayerTooltipCard :user-id="userId" :user-name="userName" :avatar-url="avatarUrl"
            :country="country" />
        </div>
      </Transition>
    </Teleport>
  </span>
</template>

<style scoped>
.tooltip-trigger {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
}
</style>

<style>
.tooltip-trigger__popup {
  z-index: 10000;
  pointer-events: auto;
  filter: drop-shadow(0 8px 24px rgba(0, 0, 0, 0.4));
}

.tooltip-enter-active {
  transition: opacity 150ms ease-out, transform 150ms ease-out;
}

.tooltip-leave-active {
  transition: opacity 100ms ease-in, transform 100ms ease-in;
}

.tooltip-enter-from,
.tooltip-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
