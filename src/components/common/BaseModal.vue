<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue';

defineOptions({ inheritAttrs: false })

const props = defineProps<{
  open: boolean
  title?: string
  maxWidth?: string
  persistent?: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

let trigger: DOMRect | null = null

function onEnter(el: Element) {
  const modal = el.firstElementChild
  if (!trigger || !(modal instanceof HTMLElement) || !modal.offsetWidth) return
  const dx = trigger.left + trigger.width / 2 - (modal.offsetLeft + modal.offsetWidth / 2)
  const dy = trigger.top + trigger.height / 2 - (modal.offsetTop + modal.offsetHeight / 2)
  const sx = Math.min(1, trigger.width / modal.offsetWidth)
  const sy = Math.min(1, trigger.height / modal.offsetHeight)
  modal.style.transition = 'none'
  modal.style.setProperty('--modal-from', `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`)
  void modal.offsetWidth
  modal.style.transition = ''
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.open) emit('close')
}

function onBackdropClick() {
  if (!props.persistent) emit('close')
}

watch(
  () => props.open,
  (open, wasOpen) => {
    if (open && !wasOpen) {
      const active = document.activeElement
      trigger = active instanceof HTMLElement && active !== document.body ? active.getBoundingClientRect() : null
    }
    if (open) document.body.style.overflow = 'hidden'
    else if (wasOpen) document.body.style.overflow = ''
  },
  { immediate: true },
)

onMounted(() => {
  document.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <Transition name="modal" @enter="onEnter">
      <div v-if="open" class="modal-backdrop" @click.self="onBackdropClick">
        <div class="modal" :style="{ maxWidth: maxWidth ?? '560px' }" role="dialog" aria-modal="true">
          <div v-if="title" class="modal__header">
            <h2 class="section-title">{{ title }}</h2>
            <button class="modal__close" aria-label="Close" @click="emit('close')">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
              </svg>
            </button>
          </div>
          <div class="modal__body">
            <slot />
          </div>
          <div v-if="$slots.footer" class="modal__footer">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  z-index: 1000;
  padding: var(--space-md);
}

.modal {
  width: 100%;
  max-height: calc(100vh - var(--space-xl) * 2);
  background: var(--bg-elevated);
  border-radius: var(--radius-modal);
  border: 1px solid var(--bg-overlay);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-lg);
  border-bottom: 1px solid var(--bg-overlay);
}

.modal__close {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-xs);
  border: none;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: var(--radius-btn);
  transition: color var(--dur-fast) var(--ease-out);
}

.modal__close:hover {
  color: var(--text-primary);
}

.modal__body {
  padding: var(--space-lg);
  overflow-y: auto;
  min-height: 0;
}

.modal__footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-sm);
  padding: var(--space-md) var(--space-lg);
  border-top: 1px solid var(--bg-overlay);
}

.modal-enter-active {
  transition: opacity var(--dur-enter) var(--ease-out);
}

.modal-leave-active {
  transition: opacity var(--dur-exit) var(--ease-in);
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .modal {
  transition: transform var(--dur-enter) var(--ease-out), opacity var(--dur-enter) var(--ease-out);
}

.modal-leave-active .modal {
  transition: transform var(--dur-exit) var(--ease-in), opacity var(--dur-exit) var(--ease-in);
}

.modal-enter-from .modal,
.modal-leave-to .modal {
  transform: var(--modal-from, scale(var(--pop-scale)));
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {

  .modal-enter-active,
  .modal-leave-active,
  .modal-enter-active .modal,
  .modal-leave-active .modal {
    transition: none;
  }
}
</style>
