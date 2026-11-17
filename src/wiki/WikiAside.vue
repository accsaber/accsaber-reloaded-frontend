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
      <span class="field-label">On This Page</span>
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
      <span class="field-label">Related</span>
      <WikiDocCard v-for="entry in related" :key="entry.slug" :entry="entry" />
    </nav>
  </aside>
</template>

<style scoped>
.wiki-aside {
  display: flex;
  flex-direction: column;
  gap: var(--space-xl);
}

.wiki-aside__toc,
.wiki-aside__related {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.wiki-aside__related {
  gap: var(--space-md);
}

.wiki-aside__anchor {
  color: var(--text-secondary);
  font-size: var(--text-caption);
  text-decoration: none;
  transition: color var(--dur-fast) var(--ease-out);
}

.wiki-aside__anchor--sub {
  padding-left: var(--space-md);
}

.wiki-aside__anchor:hover {
  color: var(--text-primary);
}

.wiki-aside__anchor--active {
  color: var(--page-accent, var(--accent));
  font-weight: 600;
}
</style>
