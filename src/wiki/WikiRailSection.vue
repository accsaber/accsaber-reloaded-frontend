<script setup lang="ts">
import { computed, inject, ref, watch } from 'vue'
import { prefetchWikiEntry, WIKI_NAVIGATE_KEY } from '@/wiki/registry'
import type { WikiSection } from '@/wiki/types'

const props = defineProps<{
  section: WikiSection
  activeSlug: string | null
  searching: boolean
}>()

const navigate = inject(WIKI_NAVIGATE_KEY, () => {})

const open = ref(true)

const containsActive = computed(
  () => props.section.entries.some((entry) => entry.slug === props.activeSlug),
)

watch(containsActive, (value) => {
  if (value) open.value = true
}, { immediate: true })

const expanded = computed(() => open.value || props.searching)
</script>

<template>
  <section class="rs" :style="{ '--section-accent': section.accent }">
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
      {{ section.title }}
    </button>

    <Transition name="collapse">
      <div v-if="expanded" class="collapsible">
        <div class="rs__body">
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
        </div>
      </div>
    </Transition>
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
  min-height: var(--control-h);
  padding: 0;
  border: none;
  background: transparent;
  color: var(--section-accent, var(--text-primary));
  font-family: var(--font-sans);
  font-size: var(--text-body);
  font-weight: 600;
  text-align: left;
  cursor: pointer;
}

.rs__chevron {
  flex-shrink: 0;
  color: var(--text-tertiary);
  transition: transform var(--dur-fast) var(--ease-out);
}

.rs__chevron--open {
  transform: rotate(90deg);
}

.rs__body {
  display: flex;
  flex-direction: column;
  padding-left: calc(12px + var(--space-sm));
}

.rs__entry {
  padding: var(--space-xs) var(--space-sm);
  margin-left: calc(-1 * var(--space-sm));
  border-radius: var(--radius-btn);
  color: var(--text-secondary);
  font-size: var(--text-body);
  text-decoration: none;
  transition:
    color var(--dur-fast) var(--ease-out),
    background-color var(--dur-fast) var(--ease-out);
}

.rs__entry:hover {
  color: var(--text-primary);
  background: var(--bg-elevated);
}

.rs__entry--active {
  color: var(--section-accent, var(--accent));
  font-weight: 600;
}
</style>
