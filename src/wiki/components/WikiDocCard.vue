<script setup lang="ts">
import { prefetchWikiEntry } from '@/wiki/registry'
import type { WikiEntry } from '@/wiki/types'

defineProps<{
  entry: WikiEntry
}>()
</script>

<template>
  <RouterLink :to="`/wiki/${entry.slug}`" class="doc-card" @mouseenter="prefetchWikiEntry(entry.slug)">
    <span class="doc-card__title">{{ entry.title }}</span>
    <span class="caption doc-card__summary">{{ entry.summary }}</span>
  </RouterLink>
</template>

<style scoped>
.doc-card {
  display: flex;
  flex-direction: column;
  gap: 2px;
  text-decoration: none;
}

.doc-card__title {
  color: var(--text-primary);
  font-size: var(--text-body);
  font-weight: 600;
  transition: color var(--dur-fast) var(--ease-out);
}

.doc-card:hover .doc-card__title {
  color: var(--page-accent, var(--accent));
}

.doc-card__summary {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
