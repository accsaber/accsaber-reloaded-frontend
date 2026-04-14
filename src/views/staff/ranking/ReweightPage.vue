<script setup lang="ts">
import { usePageMeta } from '@/composables/usePageMeta'
import ReweightTab from '@/views/staff/ranking/ReweightTab.vue'

usePageMeta({
  title: 'Reweight Maps | AccSaber Ranking',
  description: 'Bulk reweight ranked maps.',
})
</script>

<template>
  <div class="reweight-page">
    <h1 class="reweight-page__title">Reweight Maps</h1>
    <ReweightTab />
  </div>
</template>

<style scoped>
.reweight-page {
  max-width: 1030px;
  margin: 0 auto;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.reweight-page__title {
  font-size: var(--text-page-title);
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
  padding-top: var(--space-lg);
}
</style>
