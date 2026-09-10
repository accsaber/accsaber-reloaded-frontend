<script setup lang="ts">
import { inject } from 'vue'
import { formatSectionNumber, legalSectionsKey } from './legalSections'

const props = defineProps<{
  id: string
  title: string
}>()

const registry = inject(legalSectionsKey)
const number = registry ? formatSectionNumber(registry.register({ id: props.id, title: props.title })) : ''
</script>

<template>
  <section :id="id" class="legal-section">
    <h2 class="legal-section__heading">
      <span v-if="number" class="legal-section__number" aria-hidden="true">{{ number }}</span>
      {{ title }}
    </h2>
    <slot />
  </section>
</template>

<style scoped>
.legal-section {
  scroll-margin-top: calc(var(--navbar-height) + var(--space-lg));
  padding-top: var(--space-xl);
}

.legal-section__heading {
  display: flex;
  align-items: baseline;
  gap: var(--space-sm);
  margin: 0 0 var(--space-md);
  font-size: var(--text-section-heading);
  font-weight: 600;
  color: var(--text-primary);
}

.legal-section__number {
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  font-weight: 500;
  color: var(--text-tertiary);
}
</style>
