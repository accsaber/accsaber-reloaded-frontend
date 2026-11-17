<script setup lang="ts">
import QueueMapList from '@/components/domain/QueueMapList.vue'
import { usePageMeta } from '@/composables/usePageMeta'

const BASE_PARAMS = { active: false }

usePageMeta({
  title: 'Deactivated Maps | AccSaber Ranking',
  description: 'Read-only view of deactivated map difficulties.',
})

async function fetchPage(params: Record<string, unknown>) {
  const { getRankingDifficulties } = await import('@/api/ranking/maps')
  return getRankingDifficulties(params as never)
}
</script>

<template>
  <QueueMapList title="Deactivated Maps" count-label="deactivated" empty-message="No deactivated maps" variant="deactivated"
    :base-params="BASE_PARAMS" :fetch-page="fetchPage" />
</template>
