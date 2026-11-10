<script setup lang="ts">
import { readStoredString, writeStoredString } from '@/utils/storage'
import { computed, ref } from 'vue'

const props = defineProps<{
  label: string
  storageKey: string
}>()

const key = computed(() => `profile:fold:${props.storageKey}`)
const collapsed = ref(readStoredString(key.value) === '1')

function toggle() {
  collapsed.value = !collapsed.value
  writeStoredString(key.value, collapsed.value ? '1' : null)
}
</script>

<template>
  <section class="profile-fold">
    <header class="profile-fold__header">
      <h2 class="profile-fold__label">
        <button type="button" class="profile-fold__toggle" :aria-expanded="!collapsed" @click="toggle">
          <svg class="profile-fold__chevron" :class="{ 'profile-fold__chevron--collapsed': collapsed }" width="12"
            height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
            stroke-linejoin="round" aria-hidden="true">
            <path d="m6 9 6 6 6-6" />
          </svg>
          {{ label }}
        </button>
      </h2>
      <slot v-if="!collapsed" name="meta" />
    </header>
    <slot v-if="!collapsed" />
  </section>
</template>

<style scoped>
.profile-fold {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.profile-fold__header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-md);
}

.profile-fold__label {
  margin: 0;
  font-size: 0.6875rem;
}

.profile-fold__toggle {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  padding: 0;
  font: inherit;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-tertiary);
  background: none;
  border: none;
  cursor: pointer;
}

.profile-fold__toggle:hover {
  color: var(--text-primary);
}

.profile-fold__chevron--collapsed {
  transform: rotate(-90deg);
}
</style>
