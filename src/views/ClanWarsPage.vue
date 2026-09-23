<script setup lang="ts">
import Breadcrumbs, { type Crumb } from '@/components/common/Breadcrumbs.vue'
import { usePageMeta } from '@/composables/usePageMeta'
import ClanWarList from './clans/war/ClanWarList.vue'

const breadcrumbs: Crumb[] = [{ label: 'Clans', to: { name: 'clans' } }, { label: 'Wars' }]

usePageMeta({
  title: 'Clan wars | AccSaber',
  description: 'Every clan war on AccSaber, newest first.',
})
</script>

<template>
  <div class="wars-page">
    <Breadcrumbs :crumbs="breadcrumbs" />
    <header class="wars-page__header">
      <h1 class="wars-page__title">Wars</h1>
    </header>
    <ClanWarList />
  </div>
</template>

<style scoped>
.wars-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  width: 100%;
  max-width: 1080px;
  margin: 0 auto;
}

.wars-page__header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-lg) 0 var(--space-md);
}

.wars-page__title {
  margin: 0;
  font-size: var(--text-page-title);
  font-weight: 700;
  color: var(--text-primary);
}

</style>
