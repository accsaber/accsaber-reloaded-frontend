<script setup lang="ts">
import { usePageMeta } from '@/composables/usePageMeta'
import RankingMapList from '@/views/staff/ranking/RankingMapList.vue'

usePageMeta({
  title: 'Deactivated Maps | AccSaber Ranking',
  description: 'Read-only view of deactivated map difficulties.',
})
</script>

<template>
  <RankingMapList title="Deactivated Maps" count-label="deactivated" empty-message="No deactivated maps" deactivated />
</template>
