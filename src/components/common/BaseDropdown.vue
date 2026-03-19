<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';

defineProps<{
  open: boolean
  position?: 'bottom-left' | 'bottom-right' | 'right'
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const containerRef = ref<HTMLElement | null>(null)

function onClickOutside(e: MouseEvent) {
  if (containerRef.value && !containerRef.value.contains(e.target as Node)) {
    emit('update:open', false)
  }
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('update:open', false)
}

onMounted(() => {
  document.addEventListener('click', onClickOutside)
  document.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  document.removeEventListener('click', onClickOutside)
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div ref="containerRef" class="base-dropdown">
    <div class="base-dropdown__trigger" @click="$emit('update:open', !open)">
      <slot name="trigger" />
    </div>
    <Transition name="dropdown">
      <div v-if="open" class="base-dropdown__panel" :class="`base-dropdown__panel--${position ?? 'bottom-left'}`">
        <slot />
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.base-dropdown {
  position: relative;
  display: inline-block;
}

.base-dropdown__trigger {
  cursor: pointer;
}

.base-dropdown__panel {
  position: absolute;
  z-index: 100;
  min-width: 180px;
  background: var(--bg-elevated);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  padding: var(--space-sm);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.base-dropdown__panel--bottom-left {
  top: 100%;
  left: 0;
  margin-top: var(--space-xs);
}

.base-dropdown__panel--bottom-right {
  top: 100%;
  right: 0;
  margin-top: var(--space-xs);
}

.base-dropdown__panel--right {
  top: 0;
  left: 100%;
  margin-left: var(--space-xs);
}

.dropdown-enter-active,
.dropdown-leave-active {
  transition: opacity 100ms ease, transform 100ms ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

@media (prefers-reduced-motion: reduce) {

  .dropdown-enter-active,
  .dropdown-leave-active {
    transition: none;
  }
}
</style>
