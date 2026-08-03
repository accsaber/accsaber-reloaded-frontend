<script setup lang="ts">
import { prefetchWikiEntry } from '@/wiki/registry'
import type { WikiEntry, WikiTocItem } from '@/wiki/types'

defineProps<{
  toc: WikiTocItem[]
  related: WikiEntry[]
  activeAnchor: string | null
}>()
</script>

<template>
  <aside class="wiki-aside">
    <nav v-if="toc.length" class="wiki-aside__toc" aria-label="On this page">
      <span class="wiki-aside__label">On this page</span>
      <a
        v-for="item in toc"
        :key="item.id"
        :href="`#${item.id}`"
        class="wiki-aside__anchor"
        :class="{
          'wiki-aside__anchor--sub': item.level === 3,
          'wiki-aside__anchor--active': item.id === activeAnchor,
        }"
      >
        {{ item.label }}
      </a>
    </nav>

    <nav v-if="related.length" class="wiki-aside__related" aria-label="Related documents">
      <span class="wiki-aside__label">Related</span>
      <RouterLink
        v-for="entry in related"
        :key="entry.slug"
        :to="`/wiki/${entry.slug}`"
        class="wiki-aside__doc"
        @mouseenter="prefetchWikiEntry(entry.slug)"
      >
        <span class="wiki-aside__doc-title">{{ entry.title }}</span>
        <span class="wiki-aside__doc-summary">{{ entry.summary }}</span>
      </RouterLink>
    </nav>
  </aside>
</template>

<style scoped>
.wiki-aside {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.wiki-aside__label {
  display: block;
  margin-bottom: var(--space-sm);
  font-size: var(--text-caption);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary);
}

.wiki-aside__anchor {
  display: block;
  padding: 4px var(--space-sm);
  border-left: 1px solid var(--bg-overlay);
  color: var(--text-secondary);
  font-size: var(--text-caption);
  text-decoration: none;
  transition: color 120ms ease, border-color 120ms ease;
}

.wiki-aside__anchor--sub {
  padding-left: var(--space-lg);
}

.wiki-aside__anchor:hover {
  color: var(--text-primary);
}

.wiki-aside__anchor--active {
  color: var(--text-primary);
  font-weight: 600;
  border-left-color: var(--accent);
}

.wiki-aside__related {
  display: flex;
  flex-direction: column;
}

.wiki-aside__doc {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--space-sm);
  margin-bottom: var(--space-sm);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  text-decoration: none;
  transition: border-color 120ms ease;
}

.wiki-aside__doc:hover {
  border-color: var(--text-tertiary);
}

.wiki-aside__doc-title {
  color: var(--text-primary);
  font-size: var(--text-body);
  font-weight: 600;
}

.wiki-aside__doc-summary {
  color: var(--text-tertiary);
  font-size: var(--text-caption);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
