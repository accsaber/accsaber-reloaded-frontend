<script setup lang="ts">
defineProps<{
  title: string
  subtitle?: string
}>()
</script>

<template>
  <header class="page-header-bleed">
    <div class="page-header-bleed__bg" />
    <div class="page-header-bleed__content">
      <h1 class="page-header-bleed__title">{{ title }}</h1>
      <p class="page-header-bleed__subtitle">{{ subtitle ?? '\u00A0' }}</p>
    </div>
  </header>
</template>

<style scoped>
.page-header-bleed {
  position: relative;
  text-align: center;
  padding: var(--space-2xl) 0 var(--space-lg);
}

.page-header-bleed__bg {
  position: absolute;
  inset: -32px -64px 0 -64px;
  background: radial-gradient(ellipse at 50% 0%,
      color-mix(in srgb, var(--page-accent) 15%, transparent),
      transparent 70%);
  pointer-events: none;
}

.page-header-bleed__content {
  position: relative;
  z-index: 1;
}

.page-header-bleed__title {
  font-size: var(--text-page-title);
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.page-header-bleed__subtitle {
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--page-accent);
  margin: var(--space-xs) 0 0;
  letter-spacing: 0.02em;
  min-height: 1em;
}

@media (max-width: 767px) {
  .page-header-bleed {
    padding: var(--space-lg) 0 var(--space-md);
  }
}
</style>
