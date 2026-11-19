<script setup lang="ts">
import BaseTabs from '@/components/common/BaseTabs.vue'
import PlaylistDropdown from '@/components/domain/PlaylistDropdown.vue'
import QueueMapList, { type QueueEntry } from '@/components/domain/QueueMapList.vue'
import { usePageMeta } from '@/composables/usePageMeta'
import type { Tab } from '@/types/display'
import { QUEUE_STATUSES } from '@/utils/constants'
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const TABS: Tab[] = [
  { key: 'queue', label: 'Queue' },
  { key: 'suggested', label: 'Suggested' },
]
const QUEUE_PARAMS = { status: QUEUE_STATUSES.join(',') }
const SUGGESTED_PARAMS = { status: 'SUGGESTED' }

const route = useRoute()
const router = useRouter()

const suggested = computed(() => route.query.tab === 'suggested')

function setTab(tab: string) {
  void router.replace({ query: tab === 'suggested' ? { tab } : {} })
}

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
  <QueueMapList title="Ranking Queue" :count-label="suggested ? 'suggested maps' : 'maps in queue'"
    :empty-message="suggested ? 'No suggested maps' : 'No maps in the queue'" :list="suggested ? 'suggested' : 'queue'" staff
    :base-params="suggested ? SUGGESTED_PARAMS : QUEUE_PARAMS" :fetch-page="fetchPage" :row-route="rowRoute">
    <template #tabs>
      <BaseTabs :tabs="TABS" :model-value="suggested ? 'suggested' : 'queue'" @update:model-value="setTab" />
    </template>
    <template #actions>
      <PlaylistDropdown queued />
    </template>
  </QueueMapList>
</template>
