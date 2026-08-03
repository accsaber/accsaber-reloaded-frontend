<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  id: string
  level?: 2 | 3
}>()

const tag = computed(() => `h${props.level ?? 2}`)
</script>

<template>
  <component
    :is="tag"
    :id="id"
    class="wiki-heading"
    :class="`wiki-heading--${level ?? 2}`"
    :data-wiki-heading="level ?? 2"
  >
    <span class="wiki-heading__text"><slot /></span>
    <a class="wiki-heading__anchor" :href="`#${id}`" aria-label="Link to this section">#</a>
  </component>
</template>

<style scoped>
.wiki-heading {
  display: flex;
  align-items: baseline;
  gap: var(--space-sm);
  color: var(--text-primary);
  font-weight: 600;
  line-height: 1.3;
  margin: var(--space-xl) 0 var(--space-sm);
  scroll-margin-top: calc(var(--navbar-height) + var(--space-md));
}

.wiki-heading--2 {
  font-size: var(--text-section-heading);
}

.wiki-heading--3 {
  font-size: 1.05rem;
}

.wiki-heading__anchor {
  color: var(--accent);
  font-weight: 500;
  text-decoration: none;
  opacity: 0;
  transition: opacity 120ms ease;
}

.wiki-heading:hover .wiki-heading__anchor,
.wiki-heading__anchor:focus-visible {
  opacity: 1;
}
</style>
