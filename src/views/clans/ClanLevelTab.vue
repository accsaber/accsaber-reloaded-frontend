<script setup lang="ts">
import DataTable from '@/components/common/DataTable.vue'
import PaginationControls from '@/components/common/PaginationControls.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import { usePageableRoute } from '@/composables/usePageableRoute'
import type { ClanLevelResponse, ClanLevelStepResponse, ClanResponse, ClanXpGrantResponse } from '@/types/api/clans'
import type { TableColumn } from '@/types/display'
import type { Page } from '@/types/pagination'
import { CLAN_XP_SOURCE_LABEL } from '@/utils/clans'
import { formatRelativeDate } from '@/utils/formatters'
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import ClanLevelTrail from './ClanLevelTrail.vue'

const props = defineProps<{ clan: ClanResponse }>()

const route = useRoute()

const { currentPage, paginationParams, setPage } = usePageableRoute({
  defaultSort: 'createdAt',
  defaultOrder: 'desc',
  defaultSize: 25,
  secondarySort: null,
})

const level = ref<ClanLevelResponse | null>(null)
const steps = ref<ClanLevelStepResponse[]>([])
const stepsLoading = ref(true)
const xpPage = ref<Page<ClanXpGrantResponse> | null>(null)
const xpLoading = ref(true)

const currentLevel = computed(() => level.value?.progress.level ?? props.clan.level.level)

const xpColumns: TableColumn[] = [
  { key: 'source', label: 'Source', align: 'left' },
  { key: 'rawAmount', label: 'Raw', align: 'right', mono: true, width: '120px' },
  { key: 'rosterFactor', label: 'Roster factor', align: 'right', mono: true, width: '140px' },
  { key: 'amount', label: 'Banked', align: 'right', mono: true, width: '120px' },
  { key: 'createdAt', label: 'When', align: 'right', mono: true, width: '120px' },
]

const xpRows = computed(() =>
  (xpPage.value?.content ?? []).map((grant) => ({
    id: grant.id,
    source: CLAN_XP_SOURCE_LABEL[grant.source],
    rawAmount: Math.round(grant.rawAmount).toLocaleString(),
    rosterFactor: `÷ ${grant.rosterFactor.toFixed(2)}`,
    amount: Math.round(grant.amount).toLocaleString(),
    createdAt: formatRelativeDate(grant.createdAt),
  })),
)
const xpTotalPages = computed(() => xpPage.value?.totalPages ?? 0)

async function fetchLadder() {
  stepsLoading.value = true
  try {
    const { getClanLevel, getClanLevels } = await import('@/api/clans')
    const [current, table] = await Promise.all([getClanLevel(props.clan.clan.id), getClanLevels()])
    level.value = current
    steps.value = table
  } catch {
    level.value = null
    steps.value = []
  } finally {
    stepsLoading.value = false
  }
}

async function fetchXp() {
  xpLoading.value = true
  try {
    const { getClanXp } = await import('@/api/clans')
    xpPage.value = await getClanXp(props.clan.clan.id, { page: paginationParams.value.page, size: 25 })
  } catch {
    xpPage.value = null
  } finally {
    xpLoading.value = false
  }
}

fetchLadder()
watch(() => route.query.page, fetchXp, { immediate: true })
</script>

<template>
  <section class="level-tab">
    <div v-if="stepsLoading" class="level-tab__skeleton">
      <SkeletonLoader v-for="i in 6" :key="i" variant="table-row" />
    </div>

    <ClanLevelTrail v-else :steps="steps" :current-level="currentLevel" />

    <div class="level-tab__xp">
      <h2 class="level-tab__heading">XP history</h2>
      <DataTable
        :columns="xpColumns"
        :rows="xpRows"
        :loading="xpLoading"
        :loading-rows="6"
        row-key="id"
        empty-message="No XP banked yet"
      />
      <PaginationControls v-if="xpTotalPages > 1" :page="currentPage" :total-pages="xpTotalPages" @update:page="setPage" />
    </div>
  </section>
</template>

<style scoped>
.level-tab {
  display: flex;
  flex-direction: column;
  gap: var(--space-2xl);
}

.level-tab__skeleton {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.level-tab__xp {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.level-tab__heading {
  margin: 0;
  font-size: var(--text-section-heading);
  font-weight: 600;
  color: var(--text-primary);
}
</style>
