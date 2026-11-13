<script setup lang="ts">
import { formatAccuracy, formatCount } from '@/utils/formatters'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import type {
  MissionCalibrationResponse,
  MissionShortfallResponse,
  MissionStatsParams,
  MissionTier,
} from '@/types/api/statistics'
import type { TableColumn } from '@/types/display'
import { computed, ref, watch } from 'vue'
import StatsDetail from './StatsDetail.vue'
import StatsHistogram from './StatsHistogram.vue'
import StatsTable from './StatsTable.vue'
import { MISSION_TIER_LABELS, NO_VALUE, labelCase, numCol, rateCol } from './statsFormat'

const props = defineProps<{
  templateId: string
  filters: MissionStatsParams
}>()

const emit = defineEmits<{ close: [] }>()

const TIER_COLUMNS: TableColumn[] = [
  {
    key: 'tier', label: 'Tier', align: 'left',
    format: (value) => (value ? MISSION_TIER_LABELS[value as MissionTier] : NO_VALUE),
  },
  numCol('assigned', 'Assigned', 120),
  numCol('completed', 'Done', 100),
  { ...rateCol('completionRate', 'Rate', 100), primary: true },
]

const loading = ref(false)
const failed = ref(false)
const tiers = ref<MissionCalibrationResponse[]>([])
const shortfall = ref<MissionShortfallResponse[]>([])

const head = computed(() => tiers.value[0])
const tierRows = computed(() => tiers.value as unknown as Record<string, unknown>[])

let requestId = 0

async function fetchDetail() {
  const { templateId, filters } = props
  const id = ++requestId
  loading.value = true
  failed.value = false
  try {
    const api = await import('@/api/statistics')
    const [byTier, shortfallRows] = await Promise.all([
      api.getMissionCalibrationByTier(templateId, filters),
      api.getMissionShortfall(templateId, filters),
    ])
    if (id !== requestId) return
    tiers.value = byTier
    shortfall.value = shortfallRows
  } catch {
    if (id !== requestId) return
    tiers.value = []
    shortfall.value = []
    failed.value = true
  }
  loading.value = false
}

watch(() => JSON.stringify([props.templateId, props.filters]), fetchDetail, { immediate: true })
</script>

<template>
  <StatsDetail :title="head?.templateName ?? 'Mission Template'" back="Back to calibration" :failed="failed"
    @close="emit('close')">
    <template v-if="head" #meta>{{ labelCase(head.type) }}</template>

    <StatsTable :columns="TIER_COLUMNS" :rows="tierRows" :loading="loading" :page-size="7" row-key="tier"
      empty-message="No assignments match the current filters" />

    <SkeletonLoader v-if="loading" height="180px" />
    <template v-else>
      <h3 class="card-title">How Close the Failures Got</h3>
      <p v-if="!shortfall.length" class="caption">No expired missions yet</p>
      <div v-for="row in shortfall" :key="row.band" class="calib-detail__band">
        <StatsHistogram :title="labelCase(row.band)" :entries="row.buckets">
          Median reached {{ formatAccuracy(row.medianReachedFraction, 1) }},
          {{ formatCount(row.measured) }} measured of {{ formatCount(row.failed) }} expired
        </StatsHistogram>
      </div>
    </template>
  </StatsDetail>
</template>
