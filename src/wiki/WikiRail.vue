<script setup lang="ts">
import EmptyState from '@/components/common/EmptyState.vue'
import SearchBox from '@/components/common/SearchBox.vue'
import WikiRailSection from '@/wiki/WikiRailSection.vue'
import type { WikiSection } from '@/wiki/types'
import { computed } from 'vue'

const props = defineProps<{
  sections: WikiSection[]
  search: string
  activeSlug: string | null
}>()

const emit = defineEmits<{
  'update:search': [value: string]
}>()

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

.wiki-rail__sections {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}
</style>
