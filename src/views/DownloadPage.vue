<script setup lang="ts">
import Breadcrumbs from '@/components/common/Breadcrumbs.vue'
import PageHeaderBleed from '@/components/common/PageHeaderBleed.vue'
import { usePageMeta } from '@/composables/usePageMeta'

const PLUGIN_RELEASES_URL = 'https://github.com/not-dexter/accsaber-reloaded-plugin/releases'

usePageMeta({
  title: 'Download | AccSaber',
  description: 'Get the AccSaber mod for PC or for Quest.',
})
</script>

<template>
  <div class="download">
    <Breadcrumbs :crumbs="[{ label: 'Getting Started', to: '/getting-started' }, { label: 'Download' }]" />
    <PageHeaderBleed title="Download" />

    <div class="download__options">
      <a class="option" :href="PLUGIN_RELEASES_URL" target="_blank" rel="noopener noreferrer">
        <svg class="option__icon" width="40" height="40" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
          aria-hidden="true">
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
        <span class="option__label">View PC Releases</span>
        <span class="option__sub">accsaber-reloaded-plugin on GitHub</span>
      </a>

      <RouterLink class="option" to="/quest">
        <svg class="option__icon" width="40" height="40" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
          aria-hidden="true">
          <path
            d="M2 12C2 8.5 4 6.5 6.2 6.5C9.5 6.5 11 10.5 12 12C13 13.5 14.5 17.5 17.8 17.5C20 17.5 22 15.5 22 12C22 8.5 20 6.5 17.8 6.5C14.5 6.5 13 10.5 12 12C11 13.5 9.5 17.5 6.2 17.5C4 17.5 2 15.5 2 12Z" />
        </svg>
        <span class="option__label">View Quest Lite Installer</span>
        <span class="option__sub">Generate a mod linked to your account</span>
      </RouterLink>
    </div>
  </div>
</template>

<style scoped>
.download {
  max-width: 720px;
  margin: 0 auto;
  width: 100%;
  padding: var(--space-lg) var(--space-lg) var(--space-3xl);
}

.download__options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-lg);
  width: 100%;
}

.option {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  padding: var(--space-2xl) var(--space-lg);
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  color: var(--text-primary);
  text-align: center;
  text-decoration: none;
  transition: border-color 150ms ease, transform 150ms ease;
}

.option:hover {
  border-color: var(--text-tertiary);
  transform: scale(1.01);
}

.option__icon {
  color: var(--accent-overall);
  margin-bottom: var(--space-sm);
}

.option__label {
  font-size: var(--text-card-title);
  font-weight: 600;
}

.option__sub {
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

@media (max-width: 767px) {
  .download {
    padding: var(--space-md) var(--space-md) var(--space-2xl);
  }

  .download__options {
    grid-template-columns: 1fr;
    gap: var(--space-md);
  }
}

@media (prefers-reduced-motion: reduce) {
  .option {
    transition: border-color 150ms ease;
  }

  .option:hover {
    transform: none;
  }
}
</style>
