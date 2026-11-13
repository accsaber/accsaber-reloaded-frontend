<script setup lang="ts">
import type { PlayerRef } from '@/types/api/common'
import type { EventMissionLeaderboardResponse } from '@/types/api/statistics'
import type { TableColumn } from '@/types/display'
import type { Page } from '@/types/pagination'
import { computed, ref, watch } from 'vue'
import StatsDetail from './StatsDetail.vue'
import StatsTable from './StatsTable.vue'
import { STATS_PAGE_SIZE, dateCol, fmt, mainCol, numCol, playerCol, rankCol } from './statsFormat'
import { playerRoute } from './useStatsBoard'

const props = defineProps<{
  eventKey: string
  templateId: string
  missionName: string
  country: string
}>()

const emit = defineEmits<{ close: [] }>()

const COLUMNS: TableColumn[] = [
  playerCol,
  mainCol('completions', 'Completions', 130),
  numCol('xpEarned', 'XP', 100),
  numCol('itemsAwarded', 'Items', 90),
  dateCol('lastCompletedAt', 'Last Done', fmt.date),
]

const page = ref(1)
const loading = ref(false)
const pageData = ref<Page<EventMissionLeaderboardResponse> | null>(null)

const rows = computed(() => (pageData.value?.content ?? []) as unknown as Record<string, unknown>[])
const columns = computed(() => (rows.value.every((row) => row.rank === 1) ? COLUMNS : [rankCol, ...COLUMNS]))

function rowKey(row: Record<string, unknown>): string {
  return (row.player as PlayerRef).id
}

let requestId = 0

async function fetchLeaderboard() {
  const id = ++requestId
  loading.value = true
  try {
    const { getEventMissionLeaderboard } = await import('@/api/statistics')
    const result = await getEventMissionLeaderboard(
      props.eventKey,
      { page: page.value - 1, size: STATS_PAGE_SIZE },
      props.templateId,
      props.country || undefined,
    )
    if (id !== requestId) return
    pageData.value = result
  } catch {
    if (id !== requestId) return
    pageData.value = null
  }
  loading.value = false
}

watch(() => [props.eventKey, props.templateId, props.country].join('|'), () => {
  page.value = 1
})

watch(() => [props.eventKey, props.templateId, props.country, page.value].join('|'), fetchLeaderboard, {
  immediate: true,
})
</script>

<template>
  <StatsDetail :title="missionName || 'Mission'" back="Back to the event" @close="emit('close')">
    <StatsTable v-model:page="page" :columns="columns" :rows="rows" :loading="loading"
      :total-pages="pageData?.totalPages ?? 0" :row-key="rowKey" :row-to="playerRoute"
      empty-message="Nobody has completed this mission yet" />
  </StatsDetail>
</template>
