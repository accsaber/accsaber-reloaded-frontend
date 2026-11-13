<script setup lang="ts">
import { readStoredString, writeStoredString } from '@/utils/storage'
import { computed, ref } from 'vue'

const props = defineProps<{
  label: string
  storageKey: string
  defaultCollapsed?: boolean
}>()

const key = computed(() => `profile:fold:${props.storageKey}`)
const stored = readStoredString(key.value)
const collapsed = ref(stored === null ? !!props.defaultCollapsed : stored === '1')

function toggle() {
  collapsed.value = !collapsed.value
  writeStoredString(key.value, collapsed.value ? '1' : '0')
}
</script>

<template>
  <section class="stored-fold">
    <header class="stored-fold__header">
      <h2 class="stored-fold__label">
        <button type="button" class="stored-fold__toggle" :aria-expanded="!collapsed" @click="toggle">
          <svg class="stored-fold__chevron" :class="{ 'stored-fold__chevron--collapsed': collapsed }" width="12"
            height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
            stroke-linejoin="round" aria-hidden="true">
            <path d="m6 9 6 6 6-6" />
          </svg>
          {{ label }}
        </button>
      </h2>
      <slot v-if="!collapsed" name="meta" />
    </header>
    <Transition name="collapse">
      <div v-if="!collapsed" class="collapsible">
        <div class="stored-fold__inner">
          <slot />
        </div>
      </div>
    </Transition>
  </section>
</template>

<style scoped>
.stored-fold__inner {
  min-width: 0;
  padding-top: var(--space-sm);
}

.stored-fold__header {
  display: flex;
  align-items: baseline;
  gap: var(--space-sm);
}

.stored-fold__label {
  margin: 0;
  font-size: var(--text-caption);
}

.stored-fold__toggle {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  padding: 0;
  font: inherit;
  font-weight: 600;
  color: var(--text-tertiary);
  background: none;
  border: none;
  cursor: pointer;
  transition: color var(--dur-fast) var(--ease-out);
}

.stored-fold__toggle:hover {
  color: var(--text-primary);
}

.stored-fold__chevron {
  transition: transform var(--dur-fast) var(--ease-out);
}

.stored-fold__chevron--collapsed {
  transform: rotate(-90deg);
}
</style>
