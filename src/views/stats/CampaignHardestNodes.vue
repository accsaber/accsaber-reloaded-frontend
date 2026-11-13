<script setup lang="ts">
import type { MapDifficultyRef } from '@/types/api/common'
import type { CampaignNodeDifficultyResponse } from '@/types/api/statistics'
import type { TableColumn } from '@/types/display'
import { formatUserValue, requirementLabel } from '@/utils/campaignLayout'
import { ref, watch } from 'vue'
import StatsDetail from './StatsDetail.vue'
import StatsMapCell from './StatsMapCell.vue'
import StatsTable from './StatsTable.vue'
import { fmt, numCol, rateCol } from './statsFormat'
import { useLocalPages } from './useStatsBoard'

const props = defineProps<{
  campaignId: string
  campaignName: string
  country: string
}>()

const emit = defineEmits<{ close: [] }>()

function requirement(node: CampaignNodeDifficultyResponse): string {
  const parts = [
    node.requirementType
      ? `${requirementLabel(node.requirementType)} ${formatUserValue(node.requirementType, node.requirementValue)}`
      : 'No requirement',
  ]
  if (node.barrier) parts.push('Gate')
  if (node.terminal) parts.push('Final')
  return parts.join(' · ')
}

const COLUMNS: TableColumn[] = [
  { key: 'map', label: 'Map', align: 'left', noLink: true },
  {
    key: 'requirement', label: 'Requirement', align: 'left', width: '220px',
    format: (_, row) => requirement(row as unknown as CampaignNodeDifficultyResponse),
  },
  numCol('xp', 'XP', 80),
  numCol('unlocked', 'Unlocked', 110),
  numCol('cleared', 'Cleared', 100),
  { ...rateCol('clearRate', 'Clear Rate', 120), primary: true },
  numCol('medianDaysToClear', 'Median Days', 140, fmt.decimal),
]

const loading = ref(false)
const failed = ref(false)
const nodes = ref<CampaignNodeDifficultyResponse[]>([])

const { page, totalPages, pageItems } = useLocalPages(() => nodes.value as unknown as Record<string, unknown>[])

let requestId = 0

async function fetchNodes(campaignId: string, country: string) {
  const id = ++requestId
  loading.value = true
  failed.value = false
  try {
    const { getCampaignHardestNodes } = await import('@/api/statistics')
    const result = await getCampaignHardestNodes(campaignId, country || undefined)
    if (id !== requestId) return
    nodes.value = result
  } catch {
    if (id !== requestId) return
    nodes.value = []
    failed.value = true
  }
  loading.value = false
}

watch(
  () => [props.campaignId, props.country] as const,
  ([campaignId, country]) => fetchNodes(campaignId, country),
  { immediate: true },
)
</script>

<template>
  <StatsDetail :title="campaignName || 'Campaign'" back="Back to campaigns" :failed="failed" @close="emit('close')">
    <template v-if="nodes.length" #meta>{{ nodes.length }} nodes, hardest first</template>

    <StatsTable v-model:page="page" :columns="COLUMNS" :rows="pageItems" :loading="loading"
      :total-pages="totalPages" row-key="campaignDifficultyId" empty-message="No node data yet">
      <template #cell-map="{ row }">
        <StatsMapCell :map="(row.map as MapDifficultyRef)" />
      </template>
    </StatsTable>
  </StatsDetail>
</template>
