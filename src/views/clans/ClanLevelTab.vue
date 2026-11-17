<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import DataTable from '@/components/common/DataTable.vue'
import PaginationControls from '@/components/common/PaginationControls.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import { usePageableRoute } from '@/composables/usePageableRoute'
import type { ClanLevelResponse, ClanLevelStepResponse, ClanResponse, ClanXpGrantResponse, ClanXpSource } from '@/types/api/clans'
import type { TableColumn } from '@/types/display'
import type { Page } from '@/types/pagination'
import { CLAN_XP_SOURCE_LABEL, clanXpGrantLabel, clanXpGrantWhen, formatClanXp, hasUnlocks } from '@/utils/clans'
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { loadClanLevels } from './clanLevels'
import ClanLevelReward from './ClanLevelReward.vue'
import ClanLevelTrail from './ClanLevelTrail.vue'
import ClanTotals, { type ClanTotalsRow } from './ClanTotals.vue'
import './ledgerRow.css'

const props = defineProps<{ clan: ClanResponse; seasonRunning: boolean }>()

const route = useRoute()

const { currentPage, paginationParams, setPage } = usePageableRoute({
  defaultSort: 'createdAt',
  defaultOrder: 'desc',
  defaultSize: 25,
  secondarySort: null,
})

const level = ref<ClanLevelResponse | null>(null)
const steps = ref<ClanLevelStepResponse[]>([])
const loading = ref(true)
const showAll = ref(route.query.page !== undefined)
const xpPage = ref<Page<ClanXpGrantResponse> | null>(null)
const xpLoading = ref(false)

const progress = computed(() => level.value?.progress ?? props.clan.level)
const maxLevel = computed(() => Math.max(0, ...steps.value.map((s) => s.level)))
const scaling = computed(() => {
  const factor = level.value?.rosterFactor ?? 1
  return factor > 1 ? `x${factor.toFixed(1)}` : null
})
const nextRewards = computed(() =>
  steps.value
    .filter((s) => s.level > progress.value.level && hasUnlocks(s.unlocks))
    .sort((a, b) => a.level - b.level)
    .slice(0, 2),
)

const sourceRows = computed<ClanTotalsRow[]>(() =>
  (Object.entries(level.value?.seasonXpBySource ?? {}) as [ClanXpSource, number][])
    .filter(([, xp]) => xp > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([source, xp]) => ({ key: source, label: CLAN_XP_SOURCE_LABEL[source], value: xp, text: formatClanXp(xp) })),
)
const seasonXp = computed(() => sourceRows.value.reduce((sum, row) => sum + row.value, 0))
const seasonNote = computed(() =>
  [sourceRows.value.length ? `${formatClanXp(seasonXp.value)} XP` : null, scaling.value ? `clan size scaling ${scaling.value}` : null]
    .filter(Boolean)
    .join(' · '),
)

const xpColumns: TableColumn[] = [
  { key: 'source', label: 'Source', align: 'left' },
  { key: 'amount', label: 'XP', align: 'right', mono: true, width: '120px' },
  { key: 'createdAt', label: 'When', align: 'right', mono: true, width: '120px' },
]

const xpRows = computed(() =>
  (xpPage.value?.content ?? []).map((grant, index) => ({
    key: `${grant.source}-${grant.createdAt}-${index}`,
    source: clanXpGrantLabel(grant),
    amount: formatClanXp(grant.amount),
    detail:
      grant.rosterFactor > 1
        ? `${formatClanXp(grant.rawAmount)} XP with clan size scaling x${grant.rosterFactor.toFixed(1)}`
        : '',
    createdAt: clanXpGrantWhen(grant),
  })),
)
const xpTotalPages = computed(() => xpPage.value?.totalPages ?? 0)

async function fetchLevel() {
  loading.value = true
  try {
    const { getClanLevel } = await import('@/api/clans')
    const [current, table] = await Promise.all([getClanLevel(props.clan.clan.id), loadClanLevels()])
    level.value = current
    steps.value = table
  } catch {
    level.value = null
    steps.value = []
  } finally {
    loading.value = false
  }
}

async function fetchXp() {
  if (!showAll.value) return
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

function toggleAll() {
  showAll.value = !showAll.value
  if (!showAll.value && route.query.page !== undefined) setPage(1)
}

fetchLevel()
watch([() => route.query.page, showAll], fetchXp, { immediate: true })
</script>

<template>
  <section class="level-tab">
    <div v-if="loading" class="level-tab__next">
      <SkeletonLoader v-for="i in 2" :key="i" variant="card" height="220px" />
    </div>
    <div v-else-if="nextRewards.length" class="level-tab__next">
      <ClanLevelReward
        v-for="step in nextRewards"
        :key="step.level"
        :step="step"
        :xp-to-go="step.totalXpRequired - progress.totalXp"
        large
      />
    </div>

    <SkeletonLoader v-if="loading" variant="text" height="48px" />
    <ClanLevelTrail v-else-if="steps.length" :steps="steps" :max-level="maxLevel" :current-level="progress.level" :total-xp="progress.totalXp" />

    <div class="level-tab__xp">
      <h2 class="section-title level-tab__heading">
        XP This Season
        <span v-if="seasonRunning && seasonNote" class="caption">{{ seasonNote }}</span>
      </h2>
      <SkeletonLoader v-if="loading" variant="text" :lines="3" />
      <ClanTotals v-else-if="seasonRunning && sourceRows.length" :rows="sourceRows" />
      <p v-else class="caption">{{ seasonRunning ? 'No XP this season yet' : 'No season running' }}</p>
      <BaseButton class="level-tab__toggle" :aria-expanded="showAll" @click="toggleAll">
        {{ showAll ? 'Hide Grants' : 'Show All Grants' }}
      </BaseButton>
      <template v-if="showAll">
        <DataTable :columns="xpColumns" :rows="xpRows" :loading="xpLoading" :loading-rows="6" row-key="key" empty-message="No XP yet">
          <template #cell-amount="{ row }">
            <span :title="String(row.detail)">{{ row.amount }}</span>
          </template>
          <template #mobile-card="{ row }">
            <span class="ledger-row">
              <span>{{ row.source }}</span>
              <span :title="String(row.detail)">{{ row.amount }} XP</span>
              <span class="caption">{{ row.createdAt }}</span>
            </span>
          </template>
        </DataTable>
        <PaginationControls v-if="xpTotalPages > 1" :page="currentPage" :total-pages="xpTotalPages" @update:page="setPage" />
      </template>
    </div>
  </section>
</template>

<style scoped>
.level-tab {
  display: flex;
  flex-direction: column;
  gap: var(--space-xl);
}

.level-tab__next {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-md);
}

.level-tab__xp {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.level-tab__heading {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--space-sm);
}

.level-tab__toggle {
  align-self: flex-start;
}

@media (max-width: 767px) {
  .level-tab__next {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
