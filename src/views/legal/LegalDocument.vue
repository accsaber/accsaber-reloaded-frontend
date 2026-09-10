<script setup lang="ts">
import { provide, ref } from 'vue'
import { formatSectionNumber, legalSectionsKey, type LegalSectionEntry } from './legalSections'

defineProps<{
  title: string
  updated: string
}>()

const sections = ref<LegalSectionEntry[]>([])

provide(legalSectionsKey, {
  sections,
  register(entry: LegalSectionEntry) {
    sections.value.push(entry)
    return sections.value.length
  },
})
</script>

<template>
  <div class="legal">
    <header class="legal__header">
      <h1 class="legal__title">{{ title }}</h1>
      <p class="legal__updated">Last updated {{ updated }}</p>
    </header>

    <div class="legal__body">
      <nav class="legal__rail" aria-label="Sections">
        <a v-for="(section, index) in sections" :key="section.id" class="legal__rail-link"
          :href="`#${section.id}`">
          <span class="legal__rail-number" aria-hidden="true">
            {{ formatSectionNumber(index + 1) }}
          </span>
          <span class="legal__rail-label">{{ section.title }}</span>
        </a>
      </nav>

      <article class="legal__article">
        <slot />
      </article>
    </div>
  </div>
</template>

<style scoped>
.legal {
  max-width: 960px;
  margin: 0 auto;
}

.legal__header {
  padding-bottom: var(--space-lg);
  border-bottom: 1px solid var(--bg-overlay);
}

.legal__title {
  margin: 0;
  font-size: var(--text-page-title);
  font-weight: 700;
  color: var(--text-primary);
}

.legal__updated {
  margin: var(--space-xs) 0 0;
  font-size: var(--text-caption);
  color: var(--text-tertiary);
}

.legal__body {
  display: grid;
  grid-template-columns: 190px minmax(0, 1fr);
  gap: var(--space-2xl);
  align-items: start;
}

.legal__rail {
  position: sticky;
  top: calc(var(--navbar-height) + var(--space-xl));
  display: flex;
  flex-direction: column;
  padding-top: var(--space-xl);
}

.legal__rail-link {
  display: flex;
  align-items: baseline;
  gap: var(--space-sm);
  padding: var(--space-xs) 0;
  font-size: var(--text-caption);
  color: var(--text-secondary);
  text-decoration: none;
  transition: color 150ms ease;
}

.legal__rail-link:hover,
.legal__rail-link:focus-visible {
  color: var(--text-primary);
}

.legal__rail-number {
  font-family: var(--font-mono);
  color: var(--text-tertiary);
}

.legal__article {
  color: var(--text-primary);
  font-size: 1rem;
  line-height: 1.7;
  padding-bottom: var(--space-3xl);
}

.legal__article :deep(p) {
  margin: 0 0 var(--space-md);
  max-width: 72ch;
}

.legal__article :deep(ul) {
  margin: 0 0 var(--space-md);
  padding-left: var(--space-lg);
  max-width: 72ch;
}

.legal__article :deep(li) {
  margin-bottom: var(--space-xs);
}

.legal__article :deep(strong) {
  font-weight: 600;
}

.legal__article :deep(a) {
  color: var(--text-primary);
  text-decoration: underline;
  text-decoration-color: var(--text-tertiary);
  text-underline-offset: 3px;
  transition: text-decoration-color 150ms ease;
}

.legal__article :deep(a:hover),
.legal__article :deep(a:focus-visible) {
  text-decoration-color: var(--page-accent, var(--accent));
}

.legal__article :deep(.legal-facts) {
  margin: 0 0 var(--space-md);
  max-width: 72ch;
  border-top: 1px solid var(--bg-overlay);
}

.legal__article :deep(.legal-facts__row) {
  display: grid;
  grid-template-columns: 150px minmax(0, 1fr);
  gap: var(--space-md);
  padding: var(--space-sm) 0;
  border-bottom: 1px solid var(--bg-overlay);
}

.legal__article :deep(.legal-facts dt) {
  color: var(--text-secondary);
}

.legal__article :deep(.legal-facts dd) {
  margin: 0;
}

@media (max-width: 899px) {
  .legal__body {
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-md);
  }

  .legal__rail {
    position: static;
    flex-direction: row;
    flex-wrap: wrap;
    gap: var(--space-xs) var(--space-md);
    padding: var(--space-md) 0;
    border-bottom: 1px solid var(--bg-overlay);
  }

  .legal__rail-link {
    padding: 0;
  }

  .legal__article :deep(.legal-facts__row) {
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-xs);
  }
}
</style>
