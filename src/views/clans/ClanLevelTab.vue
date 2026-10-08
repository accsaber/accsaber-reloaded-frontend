<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import DataTable from '@/components/common/DataTable.vue'
import ClanBar from './ClanBar.vue'
import PaginationControls from '@/components/common/PaginationControls.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import { usePageableRoute } from '@/composables/usePageableRoute'
import type { ClanLevelResponse, ClanLevelStepResponse, ClanResponse, ClanXpGrantResponse } from '@/types/api/clans'
import type { TableColumn } from '@/types/display'
import type { Page } from '@/types/pagination'
import { CLAN_XP_SOURCE_LABEL, unlockLines } from '@/utils/clans'
import { formatRelativeDate } from '@/utils/formatters'
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import ClanLevelReward from './ClanLevelReward.vue'
import ClanLevelTrail from './ClanLevelTrail.vue'
import ClanXpSummary from './ClanXpSummary.vue'

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
const nextRewards = computed(() =>
  steps.value
    .filter((s) => s.level > progress.value.level && (unlockLines(s.unlocks).length || s.unlocks.cosmetics.length))
    .sort((a, b) => a.level - b.level)
    .slice(0, 2),
)

const xpColumns: TableColumn[] = [
  { key: 'source', label: 'Source', align: 'left' },
  { key: 'rawAmount', label: 'Earned', align: 'right', mono: true, width: '120px' },
  { key: 'kept', label: 'Kept', align: 'right', mono: true, width: '100px' },
  { key: 'amount', label: 'Banked', align: 'right', mono: true, width: '120px' },
  { key: 'createdAt', label: 'When', align: 'right', mono: true, width: '120px' },
]

const xpRows = computed(() =>
  (xpPage.value?.content ?? []).map((grant) => ({
    id: grant.id,
    source: CLAN_XP_SOURCE_LABEL[grant.source],
    rawAmount: Math.round(grant.rawAmount).toLocaleString(),
    kept: `${Math.round(100 / grant.rosterFactor)}%`,
    amount: Math.round(grant.amount).toLocaleString(),
    createdAt: formatRelativeDate(grant.createdAt),
  })),
)
const xpTotalPages = computed(() => xpPage.value?.totalPages ?? 0)

async function fetchLevel() {
  loading.value = true
  try {
    const { getClanLevel, getClanLevels } = await import('@/api/clans')
    const [current, table] = await Promise.all([getClanLevel(props.clan.clan.id), getClanLevels()])
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
      <ClanXpSummary v-else-if="level?.seasonXpBySource" :by-source="level.seasonXpBySource" />
      <BaseButton class="level-tab__toggle" size="sm" :aria-expanded="showAll" @click="toggleAll">
        {{ showAll ? 'Hide grants' : 'Show all grants' }}
      </BaseButton>
      <template v-if="showAll">
        <DataTable :columns="xpColumns" :rows="xpRows" :loading="xpLoading" :loading-rows="6" row-key="id" empty-message="No XP banked yet">
          <template #mobile-card="{ row }">
            <span class="level-tab__grant">
              <span>{{ row.source }}</span>
              <span class="level-tab__grant-value">{{ row.amount }} ({{ row.kept }})</span>
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
