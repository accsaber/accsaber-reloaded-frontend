<script setup lang="ts">
import { prefetchWikiEntry, wikiSectionBadgeFor } from '@/wiki/registry'
import type { WikiEntry } from '@/wiki/types'
import { computed } from 'vue'

const props = defineProps<{
  entry: WikiEntry
}>()

const badge = computed(() => wikiSectionBadgeFor(props.entry.slug))
</script>

<template>
  <RouterLink
    :to="`/wiki/${entry.slug}`"
    class="doc-card"
    @mouseenter="prefetchWikiEntry(entry.slug)"
  >
    <span
      v-if="badge"
      class="doc-card__kicker"
      :style="badge.accent ? { color: badge.accent } : undefined"
    >
      {{ badge.title }}
    </span>
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

.doc-card__kicker {
  font-size: 0.625rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-tertiary);
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
