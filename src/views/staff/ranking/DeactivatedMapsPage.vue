<script setup lang="ts">
import QueueMapList, { type QueueEntry } from '@/components/domain/QueueMapList.vue'
import { usePageMeta } from '@/composables/usePageMeta'
import { useAuthStore } from '@/stores/auth'

const BASE_PARAMS = { active: false }

const authStore = useAuthStore()

usePageMeta({
  title: 'Rejected Maps | AccSaber Ranking',
  description: 'Rejected map difficulties and why each one was rejected.',
})

async function fetchPage(params: Record<string, unknown>) {
  const { getRankingDifficulties } = await import('@/api/ranking/maps')
  return getRankingDifficulties(params as never)
}

function rowRoute(entry: QueueEntry) {
  return { name: 'ranking-map-detail', params: { difficultyId: entry.id } }
}

async function saveReason(entry: QueueEntry, reason: string) {
  const { deactivateMapDifficulty } = await import('@/api/ranking/maps')
  await deactivateMapDifficulty(entry.id, reason)
  entry.deactivationReason = reason
}
</script>

<template>
  <QueueMapList title="Rejected Maps" count-label="rejected" empty-message="No rejected maps" list="deactivated" staff
    :base-params="BASE_PARAMS" :fetch-page="fetchPage" :row-route="rowRoute"
    :save-reason="authStore.hasRole('RANKING_HEAD') ? saveReason : undefined" />
</template>
