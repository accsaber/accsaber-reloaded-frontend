<script setup lang="ts">
import { computed, onUnmounted, nextTick, ref } from 'vue'

defineProps<{
  label: string
  title: string
}>()

const POPUP_WIDTH = 260
const SCROLL_OPTS: AddEventListenerOptions = { capture: true, passive: true }

type Mode = 'hidden' | 'hover' | 'locked'

const mode = ref<Mode>('hidden')
const visible = computed(() => mode.value !== 'hidden')
const locked = computed(() => mode.value === 'locked')
const triggerRef = ref<HTMLElement | null>(null)
const popupRef = ref<HTMLElement | null>(null)
const popupStyle = ref<Record<string, string>>({})

let hoverTimer: ReturnType<typeof setTimeout> | null = null
let hideTimer: ReturnType<typeof setTimeout> | null = null

function updatePosition() {
  const el = triggerRef.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  const margin = 8
  const maxLeft = window.innerWidth - POPUP_WIDTH - margin
  const popupHeight = popupRef.value?.offsetHeight ?? 0
  const spaceBelow = window.innerHeight - rect.bottom - margin
  const spaceAbove = rect.top - margin
  const flipUp =
    popupHeight > 0 ? spaceBelow < popupHeight && spaceAbove > spaceBelow : spaceBelow < spaceAbove
  const style: Record<string, string> = {
    position: 'fixed',
    left: `${Math.max(margin, Math.min(rect.left, maxLeft))}px`,
    width: `${POPUP_WIDTH}px`,
  }
  if (flipUp) style.bottom = `${window.innerHeight - rect.top + margin}px`
  else style.top = `${rect.bottom + margin}px`
  popupStyle.value = style
}

function onScrollOrResize() {
  if (visible.value) updatePosition()
}

function onOutsidePointer(event: PointerEvent) {
  const target = event.target as Node | null
  if (!target) return
  if (triggerRef.value?.contains(target) || popupRef.value?.contains(target)) return
  close()
}

function attachListeners() {
  window.addEventListener('scroll', onScrollOrResize, SCROLL_OPTS)
  window.addEventListener('resize', onScrollOrResize, { passive: true })
  document.addEventListener('pointerdown', onOutsidePointer, true)
}

function detachListeners() {
  window.removeEventListener('scroll', onScrollOrResize, SCROLL_OPTS)
  window.removeEventListener('resize', onScrollOrResize)
  document.removeEventListener('pointerdown', onOutsidePointer, true)
}

function clearTimers() {
  if (hoverTimer) {
    clearTimeout(hoverTimer)
    hoverTimer = null
  }
  if (hideTimer) {
    clearTimeout(hideTimer)
    hideTimer = null
  }
}

function show(next: Mode) {
  updatePosition()
  mode.value = next
  attachListeners()
  void nextTick(updatePosition)
}

function openHover() {
  if (visible.value) return
  show('hover')
}

function close() {
  if (!visible.value) return
  mode.value = 'hidden'
  detachListeners()
}

function scheduleHide() {
  if (locked.value) return
  if (hideTimer) clearTimeout(hideTimer)
  hideTimer = setTimeout(close, 160)
}

function onMouseEnter() {
  if (hideTimer) {
    clearTimeout(hideTimer)
    hideTimer = null
  }
  if (visible.value) return
  hoverTimer = setTimeout(openHover, 350)
}

function onMouseLeave() {
  if (hoverTimer) {
    clearTimeout(hoverTimer)
    hoverTimer = null
  }
  scheduleHide()
}

function onToggle() {
  clearTimers()
  if (locked.value) close()
  else show('locked')
}

onUnmounted(() => {
  clearTimers()
  detachListeners()
})

</script>

<template>
  <span ref="triggerRef" class="card-popover" @mouseenter="onMouseEnter" @mouseleave="onMouseLeave">
    <button
      type="button"
      class="card-popover__btn"
      :class="{ 'card-popover__btn--active': visible }"
      :aria-expanded="visible"
      :aria-label="`Show ${title.toLowerCase()}`"
      @click.stop.prevent="onToggle"
      @keydown.escape="close"
    >
      {{ label }}
      <svg
        width="9"
        height="9"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="3"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </button>

    <Teleport to="body">
      <Transition name="card-popover">
        <div
          v-if="visible"
          ref="popupRef"
          class="card-popover__popup"
          :style="popupStyle"
          role="dialog"
          :aria-label="title"
          @mouseenter="clearTimers"
          @mouseleave="scheduleHide"
        >
          <div class="card-popover__head">
            <span class="card-popover__title">{{ title }}</span>
            <span class="card-popover__count">{{ label }}</span>
            <button
              v-if="locked"
              type="button"
              class="card-popover__close"
              :aria-label="`Close ${title.toLowerCase()}`"
              @click.stop.prevent="close"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
                stroke-linecap="round"
                aria-hidden="true"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div class="card-popover__body">
            <slot />
          </div>
        </div>
      </Transition>
    </Teleport>
  </span>
</template>

<style scoped>
.card-popover {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.card-popover__btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 1px 6px;
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--text-secondary);
  background: transparent;
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-pill);
  cursor: pointer;
  transition:
    color 120ms ease,
    border-color 120ms ease;
}

.card-popover__btn:hover,
.card-popover__btn--active {
  color: var(--card-accent, var(--accent));
  border-color: var(--card-accent, var(--accent));
}

.card-popover__btn:focus-visible {
  outline: none;
  border-color: var(--card-accent, var(--accent));
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--card-accent, var(--accent)) 30%, transparent);
}
</style>

<style>
.card-popover__popup {
  z-index: 10000;
  display: flex;
  flex-direction: column;
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  overflow: hidden;
  filter: drop-shadow(0 8px 24px rgba(0, 0, 0, 0.4));
  pointer-events: auto;
}

.card-popover__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  border-bottom: 1px solid var(--bg-overlay);
}

.card-popover__title {
  font-family: var(--font-sans);
  font-size: 0.5625rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--text-tertiary);
}

.card-popover__count {
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--text-secondary);
  margin-left: auto;
}

.card-popover__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px;
  background: transparent;
  border: none;
  border-radius: var(--radius-pill);
  color: var(--text-tertiary);
  cursor: pointer;
  transition:
    color 120ms ease,
    background 120ms ease;
}

.card-popover__close:hover {
  color: var(--text-primary);
  background: var(--bg-overlay);
}

.card-popover__body {
  padding: var(--space-sm);
  max-height: 260px;
  overflow-y: auto;
}

.card-popover-enter-active {
  transition:
    opacity 150ms ease-out,
    transform 150ms ease-out;
}

.card-popover-leave-active {
  transition:
    opacity 100ms ease-in,
    transform 100ms ease-in;
}

.card-popover-enter-from,
.card-popover-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

@media (prefers-reduced-motion: reduce) {
  .card-popover-enter-from,
  .card-popover-leave-to {
    transform: none;
  }
}
</style>
