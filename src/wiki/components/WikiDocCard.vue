<script setup lang="ts">
import { prefetchWikiEntry } from '@/wiki/registry'
import type { WikiEntry } from '@/wiki/types'

defineProps<{
  entry: WikiEntry
}>()
</script>

<template>
  <RouterLink
    :to="`/wiki/${entry.slug}`"
    class="doc-card"
    @mouseenter="prefetchWikiEntry(entry.slug)"
  >
    <span class="doc-card__title">{{ entry.title }}</span>
    <span class="doc-card__summary">{{ entry.summary }}</span>
  </RouterLink>
</template>

<style scoped>
.doc-card {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--space-sm);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  text-decoration: none;
  transition: border-color 120ms ease;
}

.doc-card:hover {
  border-color: var(--text-tertiary);
}

.doc-card__title {
  color: var(--text-primary);
  font-size: var(--text-body);
  font-weight: 600;
}

.doc-card__summary {
  color: var(--text-tertiary);
  font-size: var(--text-caption);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
