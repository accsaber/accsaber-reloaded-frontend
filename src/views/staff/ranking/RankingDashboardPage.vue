<script setup lang="ts">
import PlaylistDropdown from '@/components/domain/PlaylistDropdown.vue'
import { usePageMeta } from '@/composables/usePageMeta'
import RankingMapList from '@/views/staff/ranking/RankingMapList.vue'

usePageMeta({
  title: 'Ranking Queue | AccSaber',
  description: 'View and manage maps in the AccSaber ranking queue.',
})
</script>

<template>
  <RankingMapList title="Ranking Queue" count-label="maps in queue" empty-message="No maps in the queue">
    <template #actions>
      <PlaylistDropdown queued />
    </template>
  </RankingMapList>
</template>
