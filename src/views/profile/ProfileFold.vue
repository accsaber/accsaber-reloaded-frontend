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
    <Transition name="fold">
      <div v-if="!collapsed" class="profile-fold__body">
        <div class="profile-fold__inner">
          <slot />
        </div>
      </div>
    </Transition>
  </section>
</template>

<style scoped>
.profile-fold__body {
  display: grid;
  grid-template-rows: 1fr;
}

.profile-fold__inner {
  min-height: 0;
  padding-top: var(--space-sm);
}

.fold-enter-active {
  transition: grid-template-rows var(--dur-enter) var(--ease-out), opacity var(--dur-enter) var(--ease-out);
}

.fold-leave-active {
  transition: grid-template-rows var(--dur-exit) var(--ease-in), opacity var(--dur-exit) var(--ease-in);
}

.fold-enter-active .profile-fold__inner,
.fold-leave-active .profile-fold__inner {
  overflow: clip;
}

.fold-enter-from,
.fold-leave-to {
  grid-template-rows: 0fr;
  opacity: 0;
}

.profile-fold__header {
  display: flex;
  align-items: baseline;
  gap: var(--space-sm);
}

.profile-fold__label {
  margin: 0;
  font-size: var(--text-caption);
}

.profile-fold__toggle {
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

.profile-fold__toggle:hover {
  color: var(--text-primary);
}

.profile-fold__chevron {
  transition: transform var(--dur-fast) var(--ease-out);
}

.profile-fold__chevron--collapsed {
  transform: rotate(-90deg);
}
</style>
