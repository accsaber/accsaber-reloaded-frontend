<script setup lang="ts">
import WikiDocCard from '@/wiki/components/WikiDocCard.vue'
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
      <WikiDocCard v-for="entry in related" :key="entry.slug" :entry="entry" class="wiki-aside__doc" />
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
  margin-bottom: var(--space-sm);
}
</style>
