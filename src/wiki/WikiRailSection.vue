<script setup lang="ts">
import { computed, inject, ref, watch } from 'vue'
import {
  countWikiEntries,
  prefetchWikiEntry,
  sectionContainsSlug,
  WIKI_NAVIGATE_KEY,
} from '@/wiki/registry'
import type { WikiSection } from '@/wiki/types'

const props = defineProps<{
  section: WikiSection
  activeSlug: string | null
  searching: boolean
  depth: number
}>()

const navigate = inject(WIKI_NAVIGATE_KEY, () => {})

const open = ref(true)

const containsActive = computed(
  () => !!props.activeSlug && sectionContainsSlug(props.section, props.activeSlug),
)

watch(containsActive, (value) => {
  if (value) open.value = true
}, { immediate: true })

const expanded = computed(() => open.value || props.searching)
const count = computed(() => countWikiEntries(props.section))
</script>

<template>
  <section class="rs" :style="{ '--rail-depth': depth }">
    <button
      type="button"
      class="rs__header"
      :aria-expanded="expanded"
      @click="open = !open"
    >
      <svg
        class="rs__chevron"
        :class="{ 'rs__chevron--open': expanded }"
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <polyline points="9 18 15 12 9 6" />
      </svg>
      <span class="rs__title">{{ section.title }}</span>
      <span class="rs__count">{{ count }}</span>
    </button>

    <div v-if="expanded" class="rs__body">
      <RouterLink
        v-for="entry in section.entries"
        :key="entry.slug"
        :to="`/wiki/${entry.slug}`"
        class="rs__entry"
        :class="{ 'rs__entry--active': entry.slug === activeSlug }"
        @click="navigate()"
        @mouseenter="prefetchWikiEntry(entry.slug)"
      >
        {{ entry.title }}
      </RouterLink>

      <WikiRailSection
        v-for="sub in section.subsections"
        :key="sub.key"
        :section="sub"
        :active-slug="activeSlug"
        :searching="searching"
        :depth="depth + 1"
      />
    </div>
  </section>
</template>

<style scoped>
.rs {
  display: flex;
  flex-direction: column;
}

.rs__header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  width: 100%;
  padding: var(--space-sm) 0;
  padding-left: calc(var(--rail-depth) * var(--space-md));
  border: none;
  background: transparent;
  color: var(--text-primary);
  font-family: var(--font-sans);
  font-size: var(--text-body);
  font-weight: 600;
  text-align: left;
  cursor: pointer;
}

.rs__chevron {
  flex-shrink: 0;
  color: var(--text-tertiary);
  transition: transform 150ms ease;
}

.rs__chevron--open {
  transform: rotate(90deg);
}

.rs__title {
  flex: 1;
  min-width: 0;
}

.rs__count {
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--text-tertiary);
}

.rs__body {
  display: flex;
  flex-direction: column;
}

.rs__entry {
  padding: 6px var(--space-sm);
  margin-left: calc(var(--rail-depth) * var(--space-md) + var(--space-md));
  border-left: 1px solid var(--bg-overlay);
  color: var(--text-secondary);
  font-size: var(--text-body);
  text-decoration: none;
  transition: color 120ms ease, border-color 120ms ease, background-color 120ms ease;
}

.rs__entry:hover {
  color: var(--text-primary);
  background: var(--bg-elevated);
}

.rs__entry--active {
  color: var(--text-primary);
  font-weight: 600;
  border-left-color: var(--accent);
  background: var(--bg-surface);
}
</style>
