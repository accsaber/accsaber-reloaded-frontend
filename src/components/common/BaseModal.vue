<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue';

defineOptions({ inheritAttrs: false })

const props = defineProps<{
  open: boolean
  title?: string
  maxWidth?: string
}>()

const emit = defineEmits<{
  close: []
}>()

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.open) emit('close')
}

function onBackdropClick() {
  emit('close')
}

watch(
  () => props.open,
  (open) => {
    document.body.style.overflow = open ? 'hidden' : ''
  },
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
    <Transition name="modal">
      <div v-if="open" class="modal-backdrop" @click.self="onBackdropClick">
        <div class="modal" :style="{ maxWidth: maxWidth ?? '560px' }" role="dialog" aria-modal="true">
          <div v-if="title" class="modal__header">
            <h2 class="modal__title">{{ title }}</h2>
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

.modal__title {
  font-size: var(--text-section-heading);
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
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
  transition: color 120ms ease;
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
  transition: opacity 150ms ease;
}

.modal-leave-active {
  transition: opacity 150ms ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .modal {
  transition: transform 200ms ease-out, opacity 200ms ease-out;
}

.modal-leave-active .modal {
  transition: transform 150ms ease-in, opacity 150ms ease-in;
}

.modal-enter-from .modal {
  transform: scale(0.95);
  opacity: 0;
}

.modal-leave-to .modal {
  transform: scale(0.95);
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
