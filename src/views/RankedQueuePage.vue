<script setup lang="ts">
import PlaylistDropdown from '@/components/domain/PlaylistDropdown.vue'
import QueueMapList, { type QueueEntry } from '@/components/domain/QueueMapList.vue'
import { usePageMeta } from '@/composables/usePageMeta'
import { QUEUE_STATUSES } from '@/utils/constants'
import { buildMapRoute } from '@/utils/mapRoute'

const BASE_PARAMS = { status: QUEUE_STATUSES.join(',') }

usePageMeta({
  title: 'Ranking Queue | AccSaber',
  description: 'Maps awaiting ranking review on AccSaber. See community votes and criteria status.',
})

async function fetchPage(params: Record<string, unknown>) {
  const { getDifficulties } = await import('@/api/maps')
  return getDifficulties(params as never)
}

function rowRoute(entry: QueueEntry) {
  return buildMapRoute({
    beatsaverCode: entry.beatsaverCode,
    mapId: entry.mapId,
    difficulty: entry.difficulty,
    difficultyId: entry.id,
    characteristic: entry.characteristic,
  })
}
</script>

<template>
  <QueueMapList title="Ranking Queue" count-label="maps in the queue" empty-message="No maps in the queue" variant="public"
    :base-params="BASE_PARAMS" :fetch-page="fetchPage" :row-route="rowRoute">
    <template #actions>
      <PlaylistDropdown queued />
    </template>
  </QueueMapList>
</template>
