<script setup lang="ts">
defineProps<{ active?: boolean; label: string }>()
defineEmits<{ select: [] }>()
</script>

<template>
  <button
    type="button"
    class="editor-tile"
    :class="{ 'editor-tile--active': active }"
    :aria-label="label"
    :aria-pressed="active"
    :title="label"
    @click="$emit('select')"
  >
    <slot />
  </button>
</template>

<style scoped>
.editor-tile {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: transparent;
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-btn);
  color: var(--text-tertiary);
  cursor: pointer;
  transition:
    color var(--dur-fast) var(--ease-out),
    border-color var(--dur-fast) var(--ease-out),
    background var(--dur-fast) var(--ease-out);
}

.editor-tile:hover {
  color: var(--text-primary);
  border-color: var(--text-tertiary);
}

.editor-tile--active {
  color: var(--page-accent);
  border-color: var(--page-accent);
  background: color-mix(in srgb, var(--page-accent) 12%, transparent);
}
</style>
