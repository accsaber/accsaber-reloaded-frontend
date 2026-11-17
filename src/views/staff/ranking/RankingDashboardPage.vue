<script setup lang="ts">
import PlaylistDropdown from '@/components/domain/PlaylistDropdown.vue'
import QueueMapList, { type QueueEntry } from '@/components/domain/QueueMapList.vue'
import { usePageMeta } from '@/composables/usePageMeta'
import { QUEUE_STATUSES } from '@/utils/constants'

const BASE_PARAMS = { status: QUEUE_STATUSES.join(',') }

usePageMeta({
  title: 'Ranking Queue | AccSaber',
  description: 'View and manage maps in the AccSaber ranking queue.',
})

async function fetchPage(params: Record<string, unknown>) {
  const { getRankingDifficulties } = await import('@/api/ranking/maps')
  return getRankingDifficulties(params as never)
}

function rowRoute(entry: QueueEntry) {
  return { name: 'ranking-map-detail', params: { difficultyId: entry.id } }
}
</script>

<template>
  <QueueMapList title="Ranking Queue" count-label="maps in queue" empty-message="No maps in the queue" variant="staff"
    :base-params="BASE_PARAMS" :fetch-page="fetchPage" :row-route="rowRoute">
    <template #actions>
      <PlaylistDropdown queued />
    </template>
  </QueueMapList>
</template>
