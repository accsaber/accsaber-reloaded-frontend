<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

defineProps<{
  open: boolean
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
  <div ref="containerRef" class="filter-popover">
    <div class="filter-popover__trigger" @click.stop="$emit('update:open', !open)">
      <slot name="trigger" />
    </div>
    <Transition name="popover">
      <div v-if="open" class="filter-popover__panel">
        <slot />
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.filter-popover {
  position: relative;
  display: inline-block;
}

.filter-popover__trigger {
  cursor: pointer;
}

.filter-popover__panel {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: var(--space-sm);
  z-index: 100;
  min-width: 240px;
  background: var(--bg-elevated);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  padding: var(--space-md);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
}

.popover-enter-active,
.popover-leave-active {
  transition: opacity 120ms ease, transform 120ms ease;
}

.popover-enter-from,
.popover-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

@media (prefers-reduced-motion: reduce) {
  .popover-enter-active,
  .popover-leave-active {
    transition: none;
  }
}
</style>
