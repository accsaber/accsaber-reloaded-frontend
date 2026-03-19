<script setup lang="ts">
defineProps<{
  title?: string
  compact?: boolean
}>()
</script>

<template>
  <section class="page-section" :class="{ 'page-section--compact': compact }">
    <div v-if="title || $slots.actions" class="page-section__header">
      <h2 v-if="title" class="page-section__title">{{ title }}</h2>
      <div v-if="$slots.actions" class="page-section__actions">
        <slot name="actions" />
      </div>
    </div>
    <div class="page-section__content">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.page-section {
  margin-bottom: var(--space-2xl);
}

.page-section--compact {
  margin-bottom: var(--space-lg);
}

.page-section__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
  margin-bottom: var(--space-md);
}

.page-section__title {
  font-size: var(--text-section-heading);
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.page-section__actions {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}
</style>
