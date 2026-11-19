<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import BaseTabs from '@/components/common/BaseTabs.vue'
import PlaylistDropdown from '@/components/domain/PlaylistDropdown.vue'
import QueueMapList, { type QueueEntry } from '@/components/domain/QueueMapList.vue'
import { usePageMeta } from '@/composables/usePageMeta'
import { RANKING_TABS, useRankingTabs } from '@/composables/useRankingTabs'
import { useAuthStore } from '@/stores/auth'
import { buildRankingMapRoute } from '@/utils/mapRoute'

usePageMeta({
  title: 'Ranking Queue | AccSaber',
  description: 'View and manage maps in the AccSaber ranking queue.',
})

const authStore = useAuthStore()
const { tab, view, setTab } = useRankingTabs()

async function fetchPage(params: Record<string, unknown>) {
  const { getRankingDifficulties } = await import('@/api/ranking/maps')
  return getRankingDifficulties(params as never)
}

async function saveReason(entry: QueueEntry, reason: string) {
  const { deactivateMapDifficulty } = await import('@/api/ranking/maps')
  await deactivateMapDifficulty(entry.id, reason)
  entry.deactivationReason = reason
}
</script>

<template>
  <QueueMapList title="Ranking Queue" :count-label="view.countLabel" :empty-message="view.empty" :list="view.list" staff
    :base-params="view.params" :fetch-page="fetchPage" :row-route="buildRankingMapRoute"
    :save-reason="tab === 'rejected' && authStore.hasRole('RANKING_HEAD') ? saveReason : undefined">
    <template #tabs>
      <BaseTabs :tabs="RANKING_TABS" :model-value="tab" @update:model-value="setTab" />
    </template>
    <template #actions>
      <BaseButton :href="$router.resolve({ name: 'ranking-import' }).href">Import a Map</BaseButton>
      <PlaylistDropdown queued />
    </template>
  </QueueMapList>
</template>
