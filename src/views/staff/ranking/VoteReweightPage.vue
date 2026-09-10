<script setup lang="ts">
import { usePageMeta } from '@/composables/usePageMeta'
import ReweightTab from '@/views/staff/ranking/ReweightTab.vue'

usePageMeta({
  title: 'Vote Reweight | AccSaber Ranking',
  description: 'Reweight a released batch from the complexity votes staff cast on it.',
})
</script>

<template>
  <div class="vote-reweight">
    <h1 class="vote-reweight__title">Vote Reweight</h1>
    <ReweightTab />
  </div>
</template>

<style scoped>
.vote-reweight {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  width: 100%;
  max-width: 1030px;
  margin: 0 auto;
}

.vote-reweight__title {
  margin: 0;
  padding-top: var(--space-lg);
  color: var(--text-primary);
  font-size: var(--text-page-title);
  font-weight: 700;
}
</style>
