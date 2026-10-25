<script setup lang="ts">
import { readStored, writeStored } from '@/utils/storage'
import { ref, useId, watch } from 'vue'

const props = defineProps<{
  title?: string
  storageKey?: string
  fixed?: boolean
}>()

const key = `war-section:${props.storageKey ?? props.title}`
const open = ref(readStored(key, (raw) => (typeof raw === 'boolean' ? raw : null), true))
watch(open, (value) => writeStored(key, value))
const bodyId = useId()
</script>

<template>
  <section class="war-section">
    <div class="war-section__head">
      <h2 class="war-section__title section-title">
        <slot v-if="fixed" name="title">{{ title }}</slot>
        <button v-else type="button" class="war-section__toggle" :aria-expanded="open" :aria-controls="bodyId" @click="open = !open">
          <svg class="war-section__chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M6 9l6 6 6-6" />
          </svg>
          <slot name="title">{{ title }}</slot>
        </button>
      </h2>
      <span v-if="$slots.actions" class="war-section__actions"><slot name="actions" /></span>
    </div>
    <div v-show="fixed || open" :id="bodyId" class="war-section__body"><slot /></div>
  </section>
</template>

<style scoped>
.war-section {
  padding: var(--space-lg);
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
}

.war-section__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-sm);
}

.war-section__title {
  margin: 0;
}

.war-section__toggle {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  padding: 0;
  font: inherit;
  color: inherit;
  background: none;
  border: none;
  cursor: pointer;
}

.war-section__chevron {
  flex-shrink: 0;
  color: var(--text-secondary);
  transition: transform 150ms ease-out;
}

.war-section__toggle[aria-expanded='false'] .war-section__chevron {
  transform: rotate(-90deg);
}

.war-section__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs);
  margin-left: auto;
}

.war-section__body {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  margin-top: var(--space-sm);
}

@media (prefers-reduced-motion: reduce) {
  .war-section__chevron {
    transition: none;
  }
}
</style>
