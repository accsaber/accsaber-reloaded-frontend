<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import DataTable from '@/components/common/DataTable.vue'
import HintTooltip from '@/components/common/HintTooltip.vue'
import ClanBar from './ClanBar.vue'
import PaginationControls from '@/components/common/PaginationControls.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import { usePageableRoute } from '@/composables/usePageableRoute'
import type { ClanLevelResponse, ClanLevelStepResponse, ClanResponse, ClanXpGrantResponse } from '@/types/api/clans'
import type { TableColumn } from '@/types/display'
import type { Page } from '@/types/pagination'
import { clanXpGrantLabel, clanXpGrantWhen, formatClanXp, unlockLines } from '@/utils/clans'
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { loadClanLevels } from './clanLevels'
import ClanLevelReward from './ClanLevelReward.vue'
import ClanLevelTrail from './ClanLevelTrail.vue'
import ClanXpSummary from './ClanXpSummary.vue'

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
const atMax = computed(() => steps.value.length > 0 && progress.value.level >= maxLevel.value)
const xpToNext = computed(() => Math.max(0, Math.ceil(progress.value.xpForNextLevel - progress.value.xpForCurrentLevel)))
const percent = computed(() => Math.max(0, Math.min(100, progress.value.progressPercent)))
const headline = computed(() =>
  atMax.value
    ? `Level ${progress.value.level}, every reward unlocked.`
    : `Level ${progress.value.level}, ${xpToNext.value.toLocaleString()} XP to level ${progress.value.level + 1}.`,
)
const scaling = computed(() => {
  const factor = level.value?.rosterFactor ?? 1
  return factor > 1 ? `×${factor.toFixed(1)}` : null
})
const SCALING_HINT =
  "Bigger and stronger clans earn more XP per week, so it's scaled to keep every clan levelling at the same pace."
const nextRewards = computed(() =>
  steps.value
    .filter((s) => s.level > progress.value.level && (unlockLines(s.unlocks).length || s.unlocks.cosmetics.length))
    .sort((a, b) => a.level - b.level)
    .slice(0, 2),
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
        ? `${formatClanXp(grant.rawAmount)} XP with clan size scaling ×${grant.rosterFactor.toFixed(1)}`
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
    <div class="level-tab__now">
      <p class="level-tab__headline">{{ headline }}</p>
      <ClanBar v-if="!atMax" class="level-tab__bar" :value="percent" :max="100" />
      <p v-if="scaling" class="level-tab__scaling">
        Clan size scaling {{ scaling }}
        <HintTooltip :text="SCALING_HINT" label="clan size scaling" />
      </p>
    </div>

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
    <ClanLevelTrail v-else-if="steps.length" :steps="steps" :current-level="progress.level" :total-xp="progress.totalXp" />

    <div class="level-tab__xp">
      <h2 class="level-tab__heading">XP this season</h2>
      <SkeletonLoader v-if="loading" variant="text" :lines="3" />
      <ClanXpSummary v-else-if="seasonRunning" :by-source="level?.seasonXpBySource ?? {}" />
      <p v-else class="level-tab__no-season">No season running.</p>
      <BaseButton class="level-tab__toggle" size="sm" :aria-expanded="showAll" @click="toggleAll">
        {{ showAll ? 'Hide grants' : 'Show all grants' }}
      </BaseButton>
      <template v-if="showAll">
        <DataTable :columns="xpColumns" :rows="xpRows" :loading="xpLoading" :loading-rows="6" row-key="key" empty-message="No XP yet">
          <template #cell-amount="{ row }">
            <span :title="String(row.detail)">{{ row.amount }}</span>
          </template>
          <template #mobile-card="{ row }">
            <span class="level-tab__grant">
              <span>{{ row.source }}</span>
              <span class="level-tab__grant-value" :title="String(row.detail)">{{ row.amount }} XP</span>
              <span class="level-tab__grant-when">{{ row.createdAt }}</span>
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

.level-tab__now {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.level-tab__headline {
  margin: 0;
  font-size: var(--text-section-heading);
  font-weight: 600;
  color: var(--text-primary);
}

.level-tab__bar {
  max-width: 560px;
}

.level-tab__scaling {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  margin: 0;
  font-size: var(--text-caption);
  color: var(--text-secondary);
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

.level-tab__no-season {
  margin: 0;
  font-size: var(--text-body);
  color: var(--text-secondary);
}

.level-tab__toggle {
  align-self: flex-start;
}

.level-tab__heading {
  margin: 0;
  font-size: var(--text-section-heading);
  font-weight: 600;
  color: var(--text-primary);
}

.level-tab__grant {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: var(--space-md);
  align-items: baseline;
  padding: var(--space-sm) var(--space-md);
  font-size: var(--text-body);
  color: var(--text-primary);
}

.level-tab__grant-value {
  font-family: var(--font-mono);
}

.level-tab__grant-when {
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

@media (max-width: 767px) {
  .level-tab__next {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
