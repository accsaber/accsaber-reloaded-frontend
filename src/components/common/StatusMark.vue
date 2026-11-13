<script setup lang="ts">
defineProps<{
  done: boolean
}>()
</script>

<template>
  <span class="status-mark" :class="{ 'status-mark--done': done }" aria-hidden="true">
    <Transition name="swap" mode="out-in">
      <svg v-if="done" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
      <span v-else class="status-mark__dot" />
    </Transition>
  </span>
</template>

<style scoped>
.status-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  color: var(--text-tertiary);
}

.status-mark--done {
  color: var(--success);
}

.status-mark__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}
</style>
