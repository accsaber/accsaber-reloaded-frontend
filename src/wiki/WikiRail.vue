<script setup lang="ts">
import EmptyState from '@/components/common/EmptyState.vue'
import SearchBox from '@/components/common/SearchBox.vue'
import WikiRailSection from '@/wiki/WikiRailSection.vue'
import { WIKI_NAVIGATE_KEY } from '@/wiki/registry'
import type { WikiSection } from '@/wiki/types'
import { computed, inject } from 'vue'

const props = defineProps<{
  sections: WikiSection[]
  search: string
  activeSlug: string | null
}>()

const emit = defineEmits<{
  'update:search': [value: string]
}>()

const navigate = inject(WIKI_NAVIGATE_KEY, () => {})

const emptyMessage = computed(() =>
  props.search.trim() ? 'No documents match your search.' : 'The wiki has no documents yet.',
)
</script>

<template>
  <nav class="wiki-rail" aria-label="Wiki index">
    <SearchBox
      :model-value="search"
      placeholder="Search the wiki"
      @update:model-value="emit('update:search', $event)"
    />

    <RouterLink
      to="/wiki"
      class="wiki-rail__home"
      :class="{ 'wiki-rail__home--active': activeSlug === null }"
      @click="navigate()"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
      Wiki Home
    </RouterLink>

    <div v-if="sections.length" class="wiki-rail__sections">
      <WikiRailSection
        v-for="section in sections"
        :key="section.key"
        :section="section"
        :active-slug="activeSlug"
        :searching="!!search.trim()"
        :depth="0"
      />
    </div>

    <EmptyState v-else :message="emptyMessage" />
  </nav>
</template>

<style scoped>
.wiki-rail {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.wiki-rail__home {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  color: var(--text-secondary);
  font-size: var(--text-body);
  font-weight: 600;
  text-decoration: none;
  transition: color 120ms ease, border-color 120ms ease;
}

.wiki-rail__home:hover {
  color: var(--text-primary);
  border-color: var(--text-tertiary);
}

.wiki-rail__home--active {
  color: var(--text-primary);
  border-color: var(--accent);
}

.wiki-rail__sections {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}
</style>
