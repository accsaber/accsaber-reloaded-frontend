<script setup lang="ts">
import type { ResolvedReplay } from '@/utils/replay'
import { computed } from 'vue'

const props = defineProps<{
  showPin?: boolean
  pinned?: boolean
  pinDisabled?: boolean
  pinPending?: boolean
  replay: ResolvedReplay | null
  stacked?: boolean
}>()

const emit = defineEmits<{
  pin: []
  detail: []
}>()

const pinTitle = computed(() => {
  if (props.pinned) return 'Unpin score'
  if (props.pinDisabled) return 'Unpin a score to free a slot first'
  return 'Pin score'
})

function onPin() {
  if (!props.pinDisabled && !props.pinPending) emit('pin')
}
</script>

<template>
  <div class="row-actions" :class="{ 'row-actions--stacked': stacked }" @click.stop>
    <button v-if="showPin" class="row-actions__btn"
      :class="{ 'row-actions__btn--active': pinned, 'row-actions__btn--disabled': pinDisabled }"
      :aria-label="pinTitle" :title="pinTitle" :aria-pressed="pinned" :disabled="pinPending" @click.prevent="onPin">
      <svg width="14" height="14" viewBox="0 0 24 24" :fill="pinned ? 'currentColor' : 'none'" stroke="currentColor"
        :stroke-width="pinned ? 1.5 : 2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M9 4h6l-1 5 4 3v3h-5v6l-1 1-1-1v-6H6v-3l4-3-1-5z" />
      </svg>
    </button>
    <a v-if="replay" class="row-actions__btn" :href="replay.url" target="_blank" rel="noopener noreferrer"
      :aria-label="replay.label" :title="replay.label">
      <img :src="replay.icon" alt="" width="14" height="14" class="row-actions__replay" loading="lazy"
        decoding="async" />
    </a>
    <button class="row-actions__btn" aria-label="View score details" @click.prevent="emit('detail')">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M2 11L5.5 5L8 8L10.5 4L14 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"
          stroke-linejoin="round" />
        <path d="M2 13H14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
      </svg>
    </button>
  </div>
</template>

<style scoped>
.row-actions {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  flex-shrink: 0;
}

.row-actions--stacked {
  flex-direction: column;
}

.row-actions__btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: var(--radius-btn);
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  text-decoration: none;
  transition: color var(--dur-fast) var(--ease-out), background-color var(--dur-fast) var(--ease-out);
}

.row-actions__btn:hover:not(:disabled):not(.row-actions__btn--disabled) {
  background: var(--bg-overlay);
  color: var(--text-primary);
}

.row-actions__btn--active {
  color: var(--accent);
}

.row-actions__btn--disabled {
  color: var(--text-tertiary);
  cursor: not-allowed;
}

.row-actions__btn:disabled {
  cursor: progress;
}

.row-actions__replay {
  border-radius: var(--radius-xs);
}
</style>
